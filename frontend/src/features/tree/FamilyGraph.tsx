
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

    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        // Shift data to center anchor
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
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
            const flowNodes: Node[] = rawNodes.map((n: { id: number; name: string; gender?: string }) => ({
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
            const flowEdges: Edge[] = rawEdges.map((e: { source: number; target: number; type: string }, idx: number) => ({
                id: `e-${idx}`,
                source: e.source.toString(),
                target: e.target.toString(),
                type: ConnectionLineType.SmoothStep,
                animated: false,
                label: e.type === 'MARRIED_TO' ? 'Married' : '',
                style: { stroke: e.type === 'MARRIED_TO' ? '#ff0072' : '#333' }
            }));

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                flowNodes,
                flowEdges
            );

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
