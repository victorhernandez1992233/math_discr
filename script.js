// Espera a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Configuración Inicial ---
    const canvas = document.getElementById('graphCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 500;
    canvas.style.cursor = 'crosshair'; 

    // Botones
    const bfsButton = document.getElementById('bfsButton');
    const dfsButton = document.getElementById('dfsButton');
    const matrixButton = document.getElementById('matrixButton'); // NUEVO
    const resetButton = document.getElementById('resetButton');

    // Elementos de Estadísticas (NUEVO)
    const nodeCountSpan = document.getElementById('node-count');
    const edgeCountSpan = document.getElementById('edge-count');
    const matrixContainer = document.getElementById('matrix-container');
    
    // Estado del grafo
    let nodes = []; // Almacena objetos { id, x, y, radius, color, state }
    let edges = []; // Almacena objetos { from, to }
    let adjacencyList = new Map(); // Representación del grafo
    let nodeCounter = 0; 

    // Estado de la UI
    let selectedNode = null; 
    let selectedAlgorithm = null; 
    let isAnimating = false; 
    const NODE_RADIUS = 20;

    // --- 2. Funciones de Dibujo ---

    function drawNode(node) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        switch(node.state) {
            case 'visited': ctx.fillStyle = '#a0a0a0'; break;
            case 'visiting': ctx.fillStyle = '#f39c12'; break;
            case 'in-queue': ctx.fillStyle = '#3498db'; break;
            default: ctx.fillStyle = '#2ecc71';
        }
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.id, node.x, node.y);
    }

    function drawEdge(edge) {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (fromNode && toNode) {
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.strokeStyle = '#34495e'; 
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }
    }

    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        edges.forEach(drawEdge);
        nodes.forEach(drawNode);
    }

    // --- 3. Lógica del Grafo y Estadísticas ---

    /** (NUEVO) Actualiza los contadores de nodos y aristas */
    function updateStats() {
        nodeCountSpan.textContent = nodes.length;
        edgeCountSpan.textContent = edges.length;
    }

    function getNextNodeLabel(count) {
        let label = "";
        let num = count;
        do {
            label = String.fromCharCode(65 + (num % 26)) + label;
            num = Math.floor(num / 26) - 1;
        } while (num >= 0);
        return label;
    }

    function addNode(x, y) {
        const id = getNextNodeLabel(nodeCounter++);
        const newNode = {
            id, x, y,
            radius: NODE_RADIUS,
            color: '#2ecc71',
            state: 'default'
        };
        nodes.push(newNode);
        adjacencyList.set(id, []);
        redrawCanvas();
        updateStats(); // (NUEVO)
    }

    function addEdge(node1, node2) {
        const exists = edges.some(e =>
            (e.from === node1.id && e.to === node2.id) ||
            (e.from === node2.id && e.to === node1.id)
        );

        if (!exists) {
            edges.push({ from: node1.id, to: node2.id });
            adjacencyList.get(node1.id).push(node2.id);
            adjacencyList.get(node2.id).push(node1.id);
            redrawCanvas();
            updateStats(); // (NUEVO)
        }
    }

    function getNodeAt(x, y) {
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
            if (distance < node.radius) {
                return node;
            }
        }
        return null;
    }

    function resetNodeStates() {
        nodes.forEach(node => node.state = 'default');
        redrawCanvas();
    }

    // --- 4. Manejadores de Eventos ---

    canvas.addEventListener('click', (e) => {
        if (isAnimating) return; 

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const clickedNode = getNodeAt(x, y);

        if (selectedAlgorithm) {
            if (clickedNode) {
                const algo = selectedAlgorithm;
                selectedAlgorithm = null; 
                canvas.style.cursor = 'crosshair'; 
                
                if (algo === 'bfs') executeBFS(clickedNode.id);
                else if (algo === 'dfs') executeDFS(clickedNode.id);
            }
        } else if (clickedNode) {
            if (selectedNode === null) {
                selectedNode = clickedNode;
            } else {
                if (selectedNode.id !== clickedNode.id) {
                    addEdge(selectedNode, clickedNode);
                }
                selectedNode = null; 
            }
        } else {
            addNode(x, y);
            selectedNode = null; 
        }
    });

    // Eventos de los botones
    bfsButton.addEventListener('click', () => {
        selectedAlgorithm = 'bfs';
        selectedNode = null;
        canvas.style.cursor = 'pointer'; 
    });

    dfsButton.addEventListener('click', () => {
        selectedAlgorithm = 'dfs';
        selectedNode = null;
        canvas.style.cursor = 'pointer';
    });

    resetButton.addEventListener('click', () => {
        nodes = [];
        edges = [];
        adjacencyList.clear();
        nodeCounter = 0;
        selectedNode = null;
        selectedAlgorithm = null;
        isAnimating = false;
        canvas.style.cursor = 'crosshair';
        matrixContainer.innerHTML = ""; // (NUEVO) Limpia la matriz
        updateStats(); // (NUEVO)
        redrawCanvas();
    });

    /** (NUEVO) Event listener para el botón de la matriz */
    matrixButton.addEventListener('click', () => {
        if (isAnimating) return; // No generar si se está animando
        displayAdjacencyMatrix();
    });


    // --- 5. Lógica de Algoritmos y Animación ---

    function animateAlgorithm(steps) {
        if (steps.length === 0) return;
        isAnimating = true; 
        let currentStep = 0;
        
        const interval = setInterval(() => {
            if (currentStep >= steps.length) {
                clearInterval(interval);
                isAnimating = false;
                nodes.forEach(n => {
                    if (n.state !== 'default') n.state = 'visited';
                });
                redrawCanvas();
                return;
            }
            nodes.forEach(n => {
                if (n.state === 'visiting') n.state = 'visited';
            });
            const step = steps[currentStep];
            const node = nodes.find(n => n.id === step.id);
            if (node) {
                node.state = step.state;
            }
            redrawCanvas();
            currentStep++;
        }, 800); 
    }

    function executeBFS(startNodeId) {
        let steps = []; 
        let visited = new Set();
        let queue = [];

        queue.push(startNodeId);
        visited.add(startNodeId);
        steps.push({ id: startNodeId, state: 'in-queue' });

        while (queue.length > 0) {
            const currentNodeId = queue.shift();
            steps.push({ id: currentNodeId, state: 'visiting' });
            const neighbors = adjacencyList.get(currentNodeId) || [];
            
            for (const neighborId of neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push(neighborId);
                    steps.push({ id: neighborId, state: 'in-queue' });
                }
            }
            steps.push({ id: currentNodeId, state: 'visited' });
        }
        resetNodeStates(); 
        animateAlgorithm(steps);
    }

    function executeDFS(startNodeId) {
        let steps = [];
        let visited = new Set();
        let stack = [];
        stack.push(startNodeId);

        while (stack.length > 0) {
            const currentNodeId = stack.pop();
            if (!visited.has(currentNodeId)) {
                visited.add(currentNodeId);
                steps.push({ id: currentNodeId, state: 'visiting' });
                const neighbors = adjacencyList.get(currentNodeId) || [];
                
                for (let i = neighbors.length - 1; i >= 0; i--) {
                    const neighborId = neighbors[i];
                    if (!visited.has(neighborId)) {
                        stack.push(neighborId);
                        steps.push({ id: neighborId, state: 'in-queue' });
                    }
                }
                steps.push({ id: currentNodeId, state: 'visited' });
            }
        }
        resetNodeStates();
        animateAlgorithm(steps);
    }

    // --- 6. (NUEVO) Lógica de la Matriz de Adyacencia ---

    /**
     * Genera la matriz de adyacencia y las etiquetas.
     * @returns {object} { matrix: number[][], labels: string[] }
     */
    function generateAdjacencyMatrix() {
        // Ordena los nodos alfabéticamente para una matriz consistente
        const nodeIds = nodes.map(n => n.id).sort();
        const n = nodeIds.length;
        
        // Crea un mapa de ID de nodo a índice de matriz (ej. 'A' -> 0, 'B' -> 1)
        const indexMap = new Map();
        nodeIds.forEach((id, index) => indexMap.set(id, index));

        // Inicializa la matriz N x N con ceros
        const matrix = Array.from({ length: n }, () => Array(n).fill(0));

        // Rellena la matriz basándose en las aristas
        for (const edge of edges) {
            const i = indexMap.get(edge.from);
            const j = indexMap.get(edge.to);
            
            // Grafo no dirigido, marca en ambas direcciones
            matrix[i][j] = 1;
            matrix[j][i] = 1;
        }

        return { matrix, labels: nodeIds };
    }

    /**
     * Renderiza la matriz de adyacencia como una tabla HTML.
     */
    function displayAdjacencyMatrix() {
        const { matrix, labels } = generateAdjacencyMatrix();

        if (labels.length === 0) {
            matrixContainer.innerHTML = "<p>El grafo está vacío. Añade nodos y aristas.</p>";
            return;
        }

        // Construye la tabla HTML
        let html = '<h2>Matriz de Adyacencia</h2><table>';

        // Fila de encabezado (con etiquetas A, B, C...)
        html += '<tr><th>&nbsp;</th>'; // Esquina superior izquierda vacía
        labels.forEach(label => html += `<th>${label}</th>`);
        html += '</tr>';

        // Filas de datos
        matrix.forEach((row, i) => {
            html += `<tr><th>${labels[i]}</th>`; // Encabezado de fila (A, B, C...)
            row.forEach(cell => {
                html += `<td>${cell}</td>`;
            });
            html += '</tr>';
        });

        html += '</table>';
        matrixContainer.innerHTML = html;
    }


    // --- Inicialización ---
    updateStats(); // (NUEVO)
    redrawCanvas();
});