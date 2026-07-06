// Arterial - Client-side Analytics & Copilot engine

document.addEventListener('DOMContentLoaded', () => {
    // Config & state
    let benchmarkResults = {
        pandas_time_sec: 0.2375,
        cudf_time_sec: 0.0083,
        speedup: 28.5,
        num_sensors: 200
    };

    let corridors = [];

    // Load actual benchmark results if they exist
    fetch('benchmark_results.json')
        .then(response => response.json())
        .then(data => {
            benchmarkResults = data;
            updateBenchmarkUI();
        })
        .catch(err => {
            console.log('Using default benchmark statistics', err);
            updateBenchmarkUI();
        });

    // Load dynamic corridors data
    fetch('corridors.json')
        .then(response => response.json())
        .then(data => {
            corridors = data;
            populateInterventions();
        })
        .catch(err => {
            console.log('Using default static fallback corridors', err);
            corridors = [
                { id: 1, name: "I-5 South at Broadway (Corridor 3)", currentSpeed: 18, delay: "22 min delay", status: "Critical", reduct: "18%", action: "Extend Green time by 15s" },
                { id: 2, name: "US-101 North at Hollywood Blvd (Corridor 12)", currentSpeed: 24, delay: "15 min delay", status: "Critical", reduct: "14%", action: "Deploy Phase Shift Plan B" },
                { id: 3, name: "I-10 West at Santa Monica (Corridor 7)", currentSpeed: 32, delay: "8 min delay", status: "Moderate", reduct: "9%", action: "Cycle time optimization" },
                { id: 4, name: "I-405 South at Sunset Blvd (Corridor 9)", currentSpeed: 45, delay: "3 min delay", status: "Smooth", reduct: "4%", action: "No intervention needed" },
                { id: 5, name: "I-110 North at DTLA Interchange (Corridor 15)", currentSpeed: 21, delay: "18 min delay", status: "Critical", reduct: "16%", action: "Extend inbound cycle" }
            ];
            populateInterventions();
        });

    // Initialize UI Elements
    initMap();
    setupChat();
    setupActions();

    // 1. Ingestion / DOT Feed Actions
    function setupActions() {
        const ingestBtn = document.getElementById('trigger-ingestion');
        const toast = document.getElementById('toast');
        
        ingestBtn.addEventListener('click', () => {
            ingestBtn.classList.add('loading');
            ingestBtn.disabled = true;
            ingestBtn.querySelector('span').innerText = 'Syncing...';
            
            setTimeout(() => {
                ingestBtn.classList.remove('loading');
                ingestBtn.disabled = false;
                ingestBtn.querySelector('span').innerText = 'Ingest DOT Feed';
                
                // Show toast
                toast.classList.add('show');
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 4000);
                
                // Update metrics slightly to simulate a real-time shift
                document.getElementById('metric-avg-speed').innerText = '43.8 km/h';
                document.getElementById('metric-active-points').innerText = '11 / 207';
                document.getElementById('metric-active-points').className = 'metric-value text-success';
            }, 1800);
        });
    }

    // 2. Render cuDF vs pandas Benchmark Chart
    let benchmarkChartInstance = null;
    function updateBenchmarkUI() {
        // Update metric card
        document.getElementById('metric-gpu-speedup').innerText = `${benchmarkResults.speedup.toFixed(1)}x`;
        document.getElementById('stat-pandas-time').innerText = `${benchmarkResults.pandas_time_sec.toFixed(3)}s`;
        document.getElementById('stat-cudf-time').innerText = `${benchmarkResults.cudf_time_sec.toFixed(4)}s`;

        const ctx = document.getElementById('benchmark-chart').getContext('2d');
        if (benchmarkChartInstance) {
            benchmarkChartInstance.destroy();
        }

        benchmarkChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Pandas (CPU)', 'cuDF.pandas (GPU)'],
                datasets: [{
                    label: 'Execution Time (seconds) - Lower is better',
                    data: [benchmarkResults.pandas_time_sec, benchmarkResults.cudf_time_sec],
                    backgroundColor: [
                        'rgba(138, 138, 142, 0.4)',  // Muted gray
                        'rgba(255, 122, 26, 0.65)'    // Accent amber
                    ],
                    borderColor: [
                        '#8a8a8e',
                        '#ff7a1a'
                    ],
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#f8fafc', font: { weight: '600' } }
                    }
                }
            }
        });
    }

    // 3. Render Simulated Network Map on Canvas
    function initMap() {
        const canvas = document.getElementById('network-map');
        const ctx = canvas.getContext('2d');
        
        // Resize canvas correctly
        function resize() {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        // Simulated street nodes
        const nodes = [
            { x: 0.2, y: 0.3, id: 'A', name: 'I-5 / Broadway' },
            { x: 0.5, y: 0.2, id: 'B', name: 'US-101 / Hollywood' },
            { x: 0.8, y: 0.4, id: 'C', name: 'I-10 / Santa Monica' },
            { x: 0.3, y: 0.7, id: 'D', name: 'I-405 / Sunset' },
            { x: 0.7, y: 0.8, id: 'E', name: 'I-110 / DTLA' }
        ];

        const connections = [
            { from: 'A', to: 'B', speed: 18, color: '#ff4d4d' }, // Congested
            { from: 'B', to: 'C', speed: 45, color: '#ff7a1a' }, // Mod
            { from: 'A', to: 'D', speed: 24, color: '#ff4d4d' }, // Congested
            { from: 'D', to: 'E', speed: 21, color: '#ff4d4d' }, // Congested
            { from: 'E', to: 'B', speed: 56, color: '#3ecf6e' }  // Smooth
        ];

        let animationFrame;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw connections (roads)
            connections.forEach(conn => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                
                ctx.beginPath();
                ctx.moveTo(fromNode.x * canvas.width, fromNode.y * canvas.height);
                ctx.lineTo(toNode.x * canvas.width, toNode.y * canvas.height);
                ctx.strokeStyle = conn.color;
                ctx.lineWidth = 6;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Draw moving dots (simulated vehicles)
                const time = Date.now() * 0.002 * (conn.speed / 30);
                const progress = (time % 1);
                const dotX = fromNode.x * canvas.width + (toNode.x * canvas.width - fromNode.x * canvas.width) * progress;
                const dotY = fromNode.y * canvas.height + (toNode.y * canvas.height - fromNode.y * canvas.height) * progress;

                ctx.beginPath();
                ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            });

            // Draw nodes (intersections)
            nodes.forEach(node => {
                ctx.beginPath();
                ctx.arc(node.x * canvas.width, node.y * canvas.height, 8, 0, Math.PI * 2);
                ctx.fillStyle = '#ff7a1a';
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Node Labels
                ctx.fillStyle = '#8a8a8e';
                ctx.font = '600 10px Inter';
                ctx.fillText(node.name, node.x * canvas.width - 40, node.y * canvas.height - 12);
            });

            animationFrame = requestAnimationFrame(draw);
        }
        draw();
    }

    // 4. Populate Interventions Queue
    function populateInterventions() {
        const queue = document.getElementById('intervention-queue');
        queue.innerHTML = '';

        corridors.forEach(corr => {
            const statusClass = corr.status === 'Critical' ? 'text-danger' : (corr.status === 'Moderate' ? 'text-primary' : 'text-success');
            const item = document.createElement('div');
            item.className = 'intervention-item';
            
            let badgeClass = 'badge-success';
            if (corr.status === 'Critical') {
                badgeClass = 'badge-danger';
            } else if (corr.status === 'Moderate') {
                badgeClass = 'badge-primary';
            }

            item.innerHTML = `
                <div class="intervention-head">
                    <span class="intervention-title">${corr.name}</span>
                    <span class="badge ${badgeClass}">${corr.status}</span>
                </div>
                <div class="intervention-body">
                    <span>${corr.delay} (Current: ${corr.currentSpeed} km/h)</span>
                    <span class="delay-reduct">Est. Benefit: ${corr.reduct}</span>
                </div>
                <div style="font-size: 0.75rem; color: #a5b4fc; font-weight: 500;">
                    <i data-lucide="cog" style="width: 12px; height: 12px; display: inline; vertical-align: middle;"></i> Recommendation: ${corr.action}
                </div>
            `;
            queue.appendChild(item);
        });
        
        // Re-run lucide to render icons dynamically added
        lucide.createIcons();
    }

    // 5. Gemini Chatbot Simulation
    function setupChat() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-chat');
        const messagesContainer = document.getElementById('chat-messages');
        const suggestions = document.querySelectorAll('.btn-suggestion');

        const apiInput = document.getElementById('gemini-api-key');
        if (apiInput) {
            const savedKey = localStorage.getItem('gemini_api_key');
            if (savedKey) {
                apiInput.value = savedKey;
            }
            apiInput.addEventListener('change', () => {
                localStorage.setItem('gemini_api_key', apiInput.value.trim());
            });
        }

        const responses = {
            "retiming": `Based on the latest scored intersections, I recommend immediate signal adjustments on 2 corridors:
            
            1. **I-5 South at Broadway (Corridor 3)**:
               - **Action**: Extend Eastbound green cycle by 15 seconds.
               - **Estimated Improvement**: 18% reduction in queue length.
               - **Window**: Active for next 2.5 hours.
            
            2. **I-110 North at DTLA Interchange (Corridor 15)**:
               - **Action**: Modify split timings to favor inbound heavy transit.
               - **Estimated Improvement**: 16% transit delay reduction.
               
            Would you like to deploy these schedules to the local signal controller?`,
            
            "delays": `The worst transit delay spots currently recorded across the grid:
            
            - **I-5 South at Broadway**: 22 min delay (Average speed: 18 km/h).
            - **I-110 North at DTLA Interchange**: 18 min delay (Average speed: 21 km/h).
            - **US-101 North at Hollywood Blvd**: 15 min delay (Average speed: 24 km/h).
            
            All three have intervention options active in the Optimizations panel.`,
            
            "optimization": `The GPU acceleration profile shows standard **pandas (CPU)** taking **${benchmarkResults.pandas_time_sec.toFixed(3)}s** for pairwise sensor calculations. 
            
            Using **cuDF.pandas (GPU)** with T4 acceleration, execution is reduced to **${benchmarkResults.cudf_time_sec.toFixed(4)}s** — an outstanding **${benchmarkResults.speedup.toFixed(1)}x speedup**. This allows us to scale processing to city-wide matrices (50,000+ points) in sub-second cycles.`,
            
            "default": `I've analyzed the real-time METR-LA sensor dataset. The overall average speed is 42.4 km/h with 14 active congestion hot-spots.
            
            Please ask:
            1. "Which corridors need signal retiming this evening?"
            2. "Where are our worst transit delays right now?"
            3. "Summarize the GPU optimization impact."`
        };

        function addMessage(sender, text) {
            const msg = document.createElement('div');
            msg.className = `message ${sender}`;
            msg.innerHTML = `
                <i data-lucide="${sender === 'user' ? 'user' : 'bot'}" class="message-avatar"></i>
                <div class="message-content">${text}</div>
            `;
            messagesContainer.appendChild(msg);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            lucide.createIcons();
        }

        function getFallbackResponse(query) {
            const lower = query.toLowerCase();
            if (lower.includes('retime') || lower.includes('retiming') || lower.includes('signal')) {
                return responses.retiming;
            } else if (lower.includes('delay') || lower.includes('worst') || lower.includes('congested')) {
                return responses.delays;
            } else if (lower.includes('gpu') || lower.includes('cudf') || lower.includes('benchmark') || lower.includes('optimization')) {
                return responses.optimization;
            }
            return responses.default;
        }

        async function handleUserQuery(query) {
            if (!query.trim()) return;
            addMessage('user', query);
            chatInput.value = '';

            const apiKey = apiInput ? apiInput.value.trim() : '';
            if (apiKey) {
                addMessage('bot', '<span class="loading-spinner"><i data-lucide="loader" class="spin"></i> Analyzing corridor metrics via Gemini...</span>');
                const messagesList = messagesContainer.querySelectorAll('.message.bot');
                const loadingMsg = messagesList[messagesList.length - 1];

                try {
                    const prompt = `You are the Arterial Assistant. Analyze these scored corridors:
${JSON.stringify(corridors, null, 2)}

Current GPU speedup: ${benchmarkResults.speedup.toFixed(2)}x (Pandas CPU: ${benchmarkResults.pandas_time_sec.toFixed(3)}s, cuDF GPU: ${benchmarkResults.cudf_time_sec.toFixed(4)}s).

The user is asking: "${query}"

Provide a concise, direct, professional response with markdown formatting (e.g. bolding, bullet points). Keep it actionable.`;

                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: prompt
                                }]
                            }]
                        })
                    });

                    const data = await response.json();
                    if (data.candidates && data.candidates[0].content.parts[0].text) {
                        const botText = data.candidates[0].content.parts[0].text;
                        loadingMsg.querySelector('.message-content').innerHTML = botText;
                    } else {
                        throw new Error('Invalid response structure from Gemini API');
                    }
                } catch (error) {
                    console.error('Gemini API Error:', error);
                    loadingMsg.querySelector('.message-content').innerHTML = `Error contacting Gemini API. Falling back to offline rule engine.<br><br>` + getFallbackResponse(query).replace(/\n/g, '<br>');
                }
            } else {
                // Simulate typing fallback
                setTimeout(() => {
                    addMessage('bot', getFallbackResponse(query).replace(/\n/g, '<br>'));
                }, 800);
            }
        }

        sendBtn.addEventListener('click', () => handleUserQuery(chatInput.value));
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleUserQuery(chatInput.value);
        });

        suggestions.forEach(btn => {
            btn.addEventListener('click', () => {
                handleUserQuery(btn.innerText);
            });
        });
    }
});
