// Dynamic Network Graph
const canvas = document.getElementById('networkCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let nodes = [];

class Node {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
    }

    update() {
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

function connectNodes() {
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;
            const distance = Math.hypot(dx, dy);

            if (distance < 100) {
                // Choose randomly between the two node colors
                const sharedColor = Math.random() < 0.5 ? nodes[i].color : nodes[j].color;
                nodes[i].color = sharedColor;
                nodes[j].color = sharedColor;

                ctx.beginPath();
                ctx.moveTo(nodes[i].x, nodes[i].y);
                ctx.lineTo(nodes[j].x, nodes[j].y);
                ctx.lineWidth = 2;
                ctx.strokeStyle = `${sharedColor.replace(')', `, ${1 - distance / 150})`)}`;
                ctx.stroke();
            }
        }
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nodes.forEach(node => node.update());
    nodes.forEach(node => node.draw());
    connectNodes();
    requestAnimationFrame(animate);
}

function addNode() {
    if (nodes.length < 100) {
        nodes.push(new Node(Math.random() * canvas.width, Math.random() * canvas.height));
    }
}

function removeNode() {
    if (nodes.length > 50) {
        nodes.shift();
    }
}

setInterval(addNode, 300);
setInterval(removeNode, 1000);
animate();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
