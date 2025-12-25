
import React, { useEffect, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    type Edge,
    type Node,
    ConnectionLineType,
} from 'reactflow';
import dagre from 'dagre';
import { useNavigate } from 'react-router-dom';
import 'reactflow/dist/style.css';

import client from '../../api/client';

const nodeWidth = 180;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 50 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        // Marriage edges should be same-rank if possible. 
        if (edge.label === 'Married') {
            dagreGraph.setEdge(edge.source, edge.target, { minlen: 0, weight: 0 });
        } else {
            // Parent->Child edges (biological or adopted) - standard weight
            dagreGraph.setEdge(edge.source, edge.target, { weight: 1 });
        }
    });

    dagre.layout(dagreGraph);

    // Map back positions
    const nodePositions = new Map<string, { x: number, y: number }>();
    nodes.forEach(node => {
        const nodeWithPosition = dagreGraph.node(node.id);
        nodePositions.set(node.id, { x: nodeWithPosition.x, y: nodeWithPosition.y });
    });

    // Post-process 1: Align Spouses
    edges.forEach(edge => {
        if (edge.label === 'Married') {
            const p1 = nodePositions.get(edge.source);
            const p2 = nodePositions.get(edge.target);

            if (p1 && p2) {
                const maxY = Math.max(p1.y, p2.y);
                p1.y = maxY;
                p2.y = maxY;

                const minGap = nodeWidth + 40;
                const distance = Math.abs(p1.x - p2.x);

                if (distance < minGap) {
                    if (p1.x <= p2.x) {
                        p2.x = p1.x + minGap;
                    } else {
                        p1.x = p2.x + minGap;
                    }
                }

                nodePositions.set(edge.source, p1);
                nodePositions.set(edge.target, p2);
            }
        }
    });

    // Post-process 2: Find and align SIBLINGS
    // Siblings = nodes that share at least one parent (via PARENT_OF or ADOPTED_BY edges)
    // Build a map: parentId -> [childIds]
    const parentToChildren = new Map<string, Set<string>>();

    edges.forEach(edge => {
        // Parent edges: PARENT_OF (no label) or ADOPTED_BY (label='Adopted')
        if (edge.label !== 'Married') {
            const parentId = edge.source;
            const childId = edge.target;

            if (!parentToChildren.has(parentId)) {
                parentToChildren.set(parentId, new Set());
            }
            parentToChildren.get(parentId)?.add(childId);
        }
    });

    // Find sibling groups (children who share any parent)
    const siblingGroups: Set<string>[] = [];

    parentToChildren.forEach((children) => {
        // For each parent's children, merge them into sibling groups
        const currentGroup = new Set<string>();

        children.forEach(childId => {
            currentGroup.add(childId);
        });

        // Check if any of these children are already in a sibling group
        let mergedWithExisting = false;
        for (const group of siblingGroups) {
            for (const childId of currentGroup) {
                if (group.has(childId)) {
                    // Merge currentGroup into this existing group
                    currentGroup.forEach(c => group.add(c));
                    mergedWithExisting = true;
                    break;
                }
            }
            if (mergedWithExisting) break;
        }

        if (!mergedWithExisting && currentGroup.size > 0) {
            siblingGroups.push(currentGroup);
        }
    });

    // Align siblings: force them to the same Y (use the max Y among them)
    siblingGroups.forEach(siblings => {
        if (siblings.size <= 1) return;

        let maxY = 0;
        siblings.forEach(sibId => {
            const pos = nodePositions.get(sibId);
            if (pos && pos.y > maxY) {
                maxY = pos.y;
            }
        });

        // Set all siblings to maxY
        siblings.forEach(sibId => {
            const pos = nodePositions.get(sibId);
            if (pos) {
                pos.y = maxY;
                nodePositions.set(sibId, pos);
            }
        });

        // Spread siblings horizontally to prevent overlap
        const sibArray = Array.from(siblings);
        const sibGap = nodeWidth + 40;
        let startX = 0;
        sibArray.forEach((sibId, idx) => {
            const pos = nodePositions.get(sibId);
            if (pos) {
                if (idx === 0) {
                    startX = pos.x;
                } else {
                    // Ensure minimum gap from previous sibling
                    const prevPos = nodePositions.get(sibArray[idx - 1]);
                    if (prevPos && pos.x < prevPos.x + sibGap) {
                        pos.x = prevPos.x + sibGap;
                        nodePositions.set(sibId, pos);
                    }
                }
            }
        });
    });

    // Apply final positions
    nodes.forEach((node) => {
        const pos = nodePositions.get(node.id);
        if (pos) {
            node.position = {
                x: pos.x - nodeWidth / 2,
                y: pos.y - nodeHeight / 2,
            };
        }
    });

    return { nodes, edges };
};

const FamilyGraph: React.FC = () => {
    const navigate = useNavigate();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const onNodeClick = (_event: React.MouseEvent, node: Node) => {
        navigate(`/people/${node.id}`);
    };

    const fetchData = useCallback(async () => {
        try {
            const response = await client.get('/relationships/graph');
            const { nodes: rawNodes, edges: rawEdges } = response.data;

            // Transform Backend Nodes to React Flow Nodes
            const graphNodes: Node[] = rawNodes.map((n: { id: number; name: string; gender?: string }) => ({
                id: n.id.toString(),
                type: 'default',
                data: { label: `${n.name} (${n.gender || '?'})` },
                position: { x: 0, y: 0 },
                style: {
                    background: '#fff',
                    border: '1px solid #777',
                    borderRadius: '8px',
                    width: nodeWidth,
                    padding: 10
                }
            }));

            // Transform Backend Edges to React Flow Edges
            const graphEdges: Edge[] = rawEdges.map((e: { source: number; target: number; type: string }, idx: number) => ({
                id: `e-${idx}`,
                source: e.source.toString(),
                target: e.target.toString(),
                type: ConnectionLineType.SmoothStep,
                label: e.type === 'MARRIED_TO' ? 'Married' : (e.type === 'ADOPTED_BY' ? 'Adopted' : ''),
                animated: e.type === 'ADOPTED_BY', // Animate adopted edges for visibility
                style: {
                    stroke: e.type === 'MARRIED_TO' ? '#ff0072' : (e.type === 'ADOPTED_BY' ? '#2563eb' : '#374151'),
                    strokeDasharray: e.type === 'ADOPTED_BY' ? '8,4' : 'none',
                    strokeWidth: e.type === 'ADOPTED_BY' ? 3 : (e.type === 'MARRIED_TO' ? 2 : 1.5)
                }
            }));

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                graphNodes,
                graphEdges
            );
            // Pass the reacting flow edges which have label/style info attached? 
            // Wait, getLayoutedElements works on 'edges' but we might need original type info if we check edge.label
            // In getLayoutedElements we check edge.label === 'Married' which comes from the label prop we just set.
            // But for ADOPTED_BY, we set label='Adopted'.
            // The comment above is slightly misleading. getLayoutedElements uses the `label` property of the React Flow Edge
            // which is correctly set in the `graphEdges` mapping.

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);

        } catch (error) {
            console.error("Failed to fetch graph", error);
        }
    }, [setNodes, setEdges]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="h-[80vh] w-full bg-gray-100 border border-gray-300 rounded-lg shadow-inner">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                fitView
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
};

export default FamilyGraph;
