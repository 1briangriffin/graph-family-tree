
import React, { useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    type Edge,
    type Node,
    Position,
    ConnectionLineType,
} from 'reactflow';
import dagre from 'dagre';
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
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        // Shift data to center anchor
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });

    return { nodes, edges };
};

const isHorizontal = false;

const FamilyGraph: React.FC = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const fetchData = async () => {
        try {
            const response = await client.get('/relationships/graph');
            const { nodes: rawNodes, edges: rawEdges } = response.data;

            // Transform Backend Nodes to React Flow Nodes
            const flowNodes: Node[] = rawNodes.map((n: any) => ({
                id: n.id.toString(),
                type: 'default', // 'default', 'input', 'output' or custom
                data: { label: `${n.name} (${n.gender || '?'})` },
                position: { x: 0, y: 0 }, // layout will fix
                style: {
                    background: '#fff',
                    border: '1px solid #777',
                    borderRadius: '8px',
                    width: nodeWidth,
                    padding: 10
                }
            }));

            // Transform Backend Edges to React Flow Edges
            const flowEdges: Edge[] = rawEdges.map((e: any, idx: number) => ({
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
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="h-[80vh] w-full bg-gray-100 border border-gray-300 rounded-lg shadow-inner">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
};

export default FamilyGraph;
