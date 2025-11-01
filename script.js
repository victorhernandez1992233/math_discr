// Espera a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Configuración Inicial ---
    const canvas = document.getElementById('graphCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 500;

    // Botones
    const bfsButton = document.getElementById('bfsButton');
    const dfsButton = document.getElementById('dfsButton');
    const resetButton = document.getElementById('resetButton');
    
    // Estado del grafo
    let nodes = []; // Almacena objetos { id, x, y, radius, color, state }
    let edges = []; // Almacena objetos { from, to }
    let adjacencyList = new Map(); // Representación del grafo
    let nodeCounter = 0; // Para etiquetas A, B, C...

    // Estado de la UI
    let selectedNode = null; // Para crear aristas
    let selectedAlgorithm = null; // 'bfs' o 'dfs'
    let isAnimating = false; // Bloquea clics durante la animación
    const NODE_RADIUS = 20;

    // --- 2. Funciones de Dibujo ---

    /** Dibuja un nodo (círculo y texto) en el canvas */
    function drawNode(node) {
        // Dibuja el círculo
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        
        // Asigna color basado en el estado
        switch(node.state) {
            case 'visited':
                ctx.fillStyle = '#a0a0a0'; // Gris
                break;
            case 'visiting':
                ctx.fillStyle = '#f39c12'; // Naranja
                break;
            case 'in-queue':
                ctx.fillStyle = '#3498db'; // Azul
                break;
            default:
                ctx.fillStyle = '#2ecc71'; // Verde
        }
        
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        // Dibuja la etiqueta del nodo (A, B, C...)
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.id, node.x, node.y);
    }

    /** Dibuja una arista (línea) en el canvas */
    function drawEdge(edge) {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);

        if (fromNode && toNode) {
            ctx.beginPath();
            ctx.moveTo(fromNode.x, fromNode.y);
            ctx.lineTo(toNode.x, toNode.y);
            ctx.strokeStyle = '#34495e'; // Gris oscuro
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }
    }

    /** Limpia y redibuja todo el canvas */
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Dibuja aristas primero (para que estén detrás de los nodos)
        edges.forEach(drawEdge);
        // Dibuja nodos
        nodes.forEach(drawNode);
    }

    // --- 3. Lógica del Grafo (Añadir Nodos y Aristas) ---

    /** Genera la siguiente etiqueta de nodo (A, B, ..., Z, AA, AB...) */
    function getNextNodeLabel(count) {
        let label = "";
        let num = count;
        do {
            label = String.fromCharCode(65 + (num % 26)) + label;
            num = Math.floor(num / 26) - 1;
        } while (num >= 0);
        return label;
    }

    /** Añade un nuevo nodo al grafo */
    function addNode(x, y) {
        const id = getNextNodeLabel(nodeCounter++);
        const newNode = {
            id,
            x,
            y,
            radius: NODE_RADIUS,
            color: '#2ecc71',
            state: 'default' // 'default', 'visited', 'visiting', 'in-queue'
        };
        nodes.push(newNode);
        adjacencyList.set(id, []);
        redrawCanvas();
    }

    /** Añade una nueva arista (no dirigida) al grafo */
    function addEdge(node1, node2) {
        // Evita aristas duplicadas
        const exists = edges.some(e =>
            (e.from === node1.id && e.to === node2.id) ||
            (e.from === node2.id && e.to === node1.id)
        );

        if (!exists) {
            edges.push({ from: node1.id, to: node2.id });
            // Grafo no dirigido, añadir en ambas direcciones
            adjacencyList.get(node1.id).push(node2.id);
            adjacencyList.get(node2.id).push(node1.id);
            redrawCanvas();
        }
    }

    /** Encuentra el nodo en el que se hizo clic */
    function getNodeAt(x, y) {
        // Itera en reversa para encontrar el nodo superior primero
        for (let i = nodes.length - 1; i >= 0; i--) {
            const node = nodes[i];
            const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
            if (distance < node.radius) {
                return node;
            }
        }
        return null;
    }

    /** Resetea el estado visual de todos los nodos */
    function resetNodeStates() {
        nodes.forEach(node => node.state = 'default');
        redrawCanvas();
    }

    // --- 4. Manejadores de Eventos ---

    /** Maneja los clics en el canvas */
    canvas.addEventListener('click', (e) => {
        if (isAnimating) return; // No hacer nada si hay una animación en curso

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const clickedNode = getNodeAt(x, y);

        if (selectedAlgorithm) {
            // --- Fase de Ejecución de Algoritmo ---
            if (clickedNode) {
                const algo = selectedAlgorithm;
                selectedAlgorithm = null; // Resetea la selección
                document.body.style.cursor = 'default'; // Resetea el cursor
                
                // Ejecuta el algoritmo seleccionado
                if (algo === 'bfs') {
                    executeBFS(clickedNode.id);
                } else if (algo === 'dfs') {
                    executeDFS(clickedNode.id);
                }
            }
        } else if (clickedNode) {
            // --- Fase de Creación de Aristas ---
            if (selectedNode === null) {
                // Inicia la creación de una arista
                selectedNode = clickedNode;
                // Resalta visualmente (opcional, por ahora solo lo guarda)
            } else {
                // Completa la arista
                if (selectedNode.id !== clickedNode.id) {
                    addEdge(selectedNode, clickedNode);
                }
                selectedNode = null; // Resetea la selección
            }
        } else {
            // --- Fase de Creación de Nodos ---
            addNode(x, y);
            selectedNode = null; // Cancela la selección de arista si se hace clic en espacio vacío
        }
    });

    // Eventos de los botones
    bfsButton.addEventListener('click', () => {
        selectedAlgorithm = 'bfs';
        selectedNode = null;
        document.body.style.cursor = 'pointer';
        console.log("Seleccionado BFS. Haz clic en un nodo para empezar.");
    });

    dfsButton.addEventListener('click', () => {
        selectedAlgorithm = 'dfs';
        selectedNode = null;
        document.body.style.cursor = 'pointer';
        console.log("Seleccionado DFS. Haz clic en un nodo para empezar.");
    });

    resetButton.addEventListener('click', () => {
        nodes = [];
        edges = [];
        adjacencyList.clear();
        nodeCounter = 0;
        selectedNode = null;
        selectedAlgorithm = null;
        isAnimating = false;
        document.body.style.cursor = 'default';
        redrawCanvas();
        console.log("Grafo limpiado.");
    });

    // --- 5. Lógica de Algoritmos y Animación ---

    /**
     * Ejecuta una animación basada en una lista de pasos.
     * Cada paso es un objeto { id, state }
     */
    function animateAlgorithm(steps) {
        if (steps.length === 0) return;

        isAnimating = true; // Bloquea la UI
        let currentStep = 0;
        
        const interval = setInterval(() => {
            if (currentStep >= steps.length) {
                clearInterval(interval);
                isAnimating = false;
                // Mantenemos el estado final de 'visited'
                nodes.forEach(n => {
                    if (n.state !== 'default') n.state = 'visited';
                });
                redrawCanvas();
                return;
            }

            // Resetea el estado 'visiting' anterior
            nodes.forEach(n => {
                if (n.state === 'visiting') n.state = 'visited';
            });

            // Aplica el estado del paso actual
            const step = steps[currentStep];
            const node = nodes.find(n => n.id === step.id);
            if (node) {
                node.state = step.state;
            }

            redrawCanvas();
            currentStep++;
        }, 800); // Velocidad de la animación (800ms por paso)
    }

    /** Ejecuta el algoritmo BFS y genera los pasos de animación */
    function executeBFS(startNodeId) {
        let steps = []; // Almacenará los pasos de la animación
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
            // Después de visitar, marca como visitado
            steps.push({ id: currentNodeId, state: 'visited' });
        }
        
        resetNodeStates(); // Limpia estados anteriores
        animateAlgorithm(steps);
    }

    /** Ejecuta el algoritmo DFS y genera los pasos de animación */
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
                // Itera en reversa para que el primer vecino (alfabético) se visite primero
                for (let i = neighbors.length - 1; i >= 0; i--) {
                    const neighborId = neighbors[i];
                    if (!visited.has(neighborId)) {
                        stack.push(neighborId);
                        // Marcamos como 'in-queue' aunque sea una pila, visualmente es útil
                        steps.push({ id: neighborId, state: 'in-queue' });
                    }
                }
                steps.push({ id: currentNodeId, state: 'visited' });
            }
        }
        
        resetNodeStates();
        animateAlgorithm(steps);
    }

    // Dibujo inicial (lienzo vacío)
    redrawCanvas();
});