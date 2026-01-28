
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
        // Check data.edgeType since labels now contain dates
        if (edge.data?.edgeType === 'MARRIED_TO') {
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
    // Post-process 1: Find and align SIBLINGS first
    // Siblings = nodes that share at least one parent (via PARENT_OF or ADOPTED_BY edges)
    // Build a map: parentId -> [childIds]
    const parentToChildren = new Map<string, Set<string>>();

    edges.forEach(edge => {
        // Parent edges: PARENT_OF (no edgeType or PARENT_OF) or ADOPTED_BY
        if (edge.data?.edgeType !== 'MARRIED_TO') {
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
    });
    // Post-process 2: Align Spouses AFTER sibling alignment
    // Strategy: For people with multiple marriages, use the Y from their ANCHORED spouse
    // (the one with parents in the tree) rather than maxY which pulls them down

    // Build set of anchored nodes (have at least one parent edge pointing to them)
    const anchoredNodes = new Set<string>();
    edges.forEach(edge => {
        if (edge.data?.edgeType !== 'MARRIED_TO') {
            anchoredNodes.add(edge.target);
        }
    });

    // First pass: For each person, determine the target Y based on their anchored spouse(s)
    const targetYMap = new Map<string, number>();

    // Initialize with current positions
    nodePositions.forEach((pos, nodeId) => {
        targetYMap.set(nodeId, pos.y);
    });

    // For each marriage, if one spouse is anchored and the other isn't,
    // the non-anchored one should adopt the anchored one's Y
    edges.forEach(edge => {
        if (edge.data?.edgeType === 'MARRIED_TO') {
            const sourceId = edge.source;
            const targetId = edge.target;
            const sourceAnchored = anchoredNodes.has(sourceId);
            const targetAnchored = anchoredNodes.has(targetId);
            const sourceY = nodePositions.get(sourceId)?.y ?? 0;
            const targetY = nodePositions.get(targetId)?.y ?? 0;

            if (sourceAnchored && !targetAnchored) {
                // Target should adopt source's Y (but don't go higher than current)
                const currentTargetY = targetYMap.get(targetId) ?? targetY;
                // Use the ANCHORED spouse's Y (prioritize anchored positions)
                targetYMap.set(targetId, sourceY);
            } else if (targetAnchored && !sourceAnchored) {
                const currentSourceY = targetYMap.get(sourceId) ?? sourceY;
                targetYMap.set(sourceId, targetY);
            }
        }
    });

    // Apply the target Y values
    targetYMap.forEach((y, nodeId) => {
        const pos = nodePositions.get(nodeId);
        if (pos) {
            pos.y = y;
            nodePositions.set(nodeId, pos);
        }
    });

    // Now process marriages to ensure spouses are at the same Y
    // and have proper horizontal spacing
    edges.forEach(edge => {
        if (edge.data?.edgeType === 'MARRIED_TO') {
            const p1 = nodePositions.get(edge.source);
            const p2 = nodePositions.get(edge.target);

            if (p1 && p2) {
                // If they're not at the same Y, align to the one who is anchored
                if (Math.abs(p1.y - p2.y) > 5) {
                    const sourceAnchored = anchoredNodes.has(edge.source);
                    const targetAnchored = anchoredNodes.has(edge.target);

                    if (sourceAnchored && !targetAnchored) {
                        p2.y = p1.y;
                    } else if (targetAnchored && !sourceAnchored) {
                        p1.y = p2.y;
                    } else {
                        // Use min Y to keep people at higher (earlier) levels
                        const minY = Math.min(p1.y, p2.y);
                        p1.y = minY;
                        p2.y = minY;
                    }
                }

                // Ensure minimum horizontal gap
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

    // Post-process 3: Resolve ALL overlaps at each Y level
    // Group all nodes by their Y position (with some tolerance for floating point)
    const yLevels = new Map<number, string[]>();
    const yTolerance = 5; // Nodes within 5px of each other are considered same level

    nodePositions.forEach((pos, nodeId) => {
        // Find if there's already a level close to this Y
        let foundLevel = false;
        yLevels.forEach((nodeIds, levelY) => {
            if (Math.abs(pos.y - levelY) < yTolerance) {
                nodeIds.push(nodeId);
                foundLevel = true;
            }
        });
        if (!foundLevel) {
            yLevels.set(pos.y, [nodeId]);
        }
    });

    // For each Y level, sort nodes by X and ensure minimum spacing
    const minNodeGap = nodeWidth + 60; // Minimum gap between node centers

    yLevels.forEach((nodeIds) => {
        if (nodeIds.length <= 1) return;

        // Sort by current X position
        nodeIds.sort((a, b) => {
            const posA = nodePositions.get(a);
            const posB = nodePositions.get(b);
            return (posA?.x || 0) - (posB?.x || 0);
        });

        // Ensure minimum spacing between consecutive nodes
        for (let i = 1; i < nodeIds.length; i++) {
            const prevPos = nodePositions.get(nodeIds[i - 1]);
            const currPos = nodePositions.get(nodeIds[i]);

            if (prevPos && currPos) {
                const currentGap = currPos.x - prevPos.x;
                if (currentGap < minNodeGap) {
                    // Push current node (and all subsequent nodes) to the right
                    const shiftAmount = minNodeGap - currentGap;
                    for (let j = i; j < nodeIds.length; j++) {
                        const pos = nodePositions.get(nodeIds[j]);
                        if (pos) {
                            pos.x += shiftAmount;
                            nodePositions.set(nodeIds[j], pos);
                        }
                    }
                }
            }
        }
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
            const graphEdges: Edge[] = rawEdges.map((e: {
                source: number;
                target: number;
                type: string;
                start_date?: string;
                end_date?: string;
                end_reason?: string;
                source_name?: string;
                target_name?: string;
            }, idx: number) => {
                let edgeLabel = '';
                let labelStyle: React.CSSProperties = {};

                if (e.type === 'MARRIED_TO') {
                    // Build marriage tooltip/label
                    let status = '';
                    if (e.end_reason === 'divorce') {
                        status = 'Divorced';
                        labelStyle = { fill: '#dc2626', fontSize: 10, fontWeight: 500 };
                    } else if (e.end_reason === 'death') {
                        status = 'Widowed';
                        labelStyle = { fill: '#4b5563', fontSize: 10, fontWeight: 500 };
                    } else if (!e.end_date) {
                        status = 'Married';
                        labelStyle = { fill: '#16a34a', fontSize: 10, fontWeight: 500 };
                    } else {
                        status = 'Ended';
                        labelStyle = { fill: '#6b7280', fontSize: 10 };
                    }

                    if (e.start_date || e.end_date) {
                        edgeLabel = `${status} (${e.start_date || '?'} - ${e.end_date || 'present'})`;
                    } else {
                        edgeLabel = status;
                    }
                } else if (e.type === 'ADOPTED_BY') {
                    edgeLabel = 'Adopted';
                    labelStyle = { fill: '#2563eb', fontSize: 10 };
                }

                return {
                    id: `e-${idx}`,
                    source: e.source.toString(),
                    target: e.target.toString(),
                    type: ConnectionLineType.SmoothStep,
                    label: edgeLabel,
                    labelStyle,
                    labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
                    labelBgPadding: [4, 2] as [number, number],
                    labelBgBorderRadius: 4,
                    animated: e.type === 'ADOPTED_BY',
                    data: { edgeType: e.type },  // Store original edge type for layout calculations
                    style: {
                        stroke: e.type === 'MARRIED_TO' ? '#ff0072' : (e.type === 'ADOPTED_BY' ? '#2563eb' : '#374151'),
                        strokeDasharray: e.type === 'ADOPTED_BY' ? '8,4' : 'none',
                        strokeWidth: e.type === 'ADOPTED_BY' ? 3 : (e.type === 'MARRIED_TO' ? 2 : 1.5)
                    }
                };
            });

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
