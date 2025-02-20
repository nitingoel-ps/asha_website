import React, { useEffect, useRef } from "react";

const NeuralNetwork = ({ nodeCount = 20 }) => {  // Changed from hardcoded 40 to configurable 20
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let nodes = [];

    // Add responsive node count calculation
    const calculateNodeCount = () => {
      const width = window.innerWidth;
      if (width <= 768) {
        return Math.floor(nodeCount * 0.5); // 50% nodes on mobile
      } else if (width <= 992) {
        return Math.floor(nodeCount * 0.7); // 70% nodes on tablet
      }
      return nodeCount; // Full count on desktop
    };


    class Node {
      constructor() {
        const section = Math.floor(Math.random() * 4);
        const padding = 20; // Reduced from 100 to use more space

        switch(section) {
          case 0:
            this.x = Math.random() * (canvas.width/2 - padding);
            this.y = Math.random() * (canvas.height/2 - padding);
            break;
          case 1:
            this.x = canvas.width/2 + Math.random() * (canvas.width/2 - padding);
            this.y = Math.random() * (canvas.height/2 - padding);
            break;
          case 2:
            this.x = Math.random() * (canvas.width/2 - padding);
            this.y = canvas.height/2 + Math.random() * (canvas.height/2 - padding);
            break;
          default:
            this.x = canvas.width/2 + Math.random() * (canvas.width/2 - padding);
            this.y = canvas.height/2 + Math.random() * (canvas.height/2 - padding);
        }

        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        const padding = 10; // Reduced from 50 to use more space
        if (this.x < padding || this.x > canvas.width - padding) {
          this.vx *= -1;
          this.x = Math.max(padding, Math.min(canvas.width - padding, this.x));
        }
        if (this.y < padding || this.y > canvas.height - padding) {
          this.vy *= -1;
          this.y = Math.max(padding, Math.min(canvas.height - padding, this.y));
        }
      }

      draw() {
        // Draw the glowing point
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, 8
        );
        gradient.addColorStop(0, 'rgba(0, 220, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 220, 255, 0)');
        
        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw the solid center
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 220, 255, 1)';
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
            
      // Recalculate nodes when resizing
      const newNodeCount = calculateNodeCount();
      nodes = Array.from({ length: newNodeCount }, () => new Node());
    };

    resize();
    window.addEventListener("resize", resize);    

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections first
      nodes.forEach((node1, i) => {
        nodes.slice(i + 1).forEach(node2 => {
          const dx = node1.x - node2.x;
          const dy = node1.y - node2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 300;

          if (distance < maxDistance) {
            const opacity = Math.pow(1 - distance / maxDistance, 2) * 0.7; // Increased opacity
            ctx.strokeStyle = `rgba(0, 220, 255, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(node1.x, node1.y);
            ctx.lineTo(node2.x, node2.y);
            ctx.stroke();
          }
        });
      });

      // Update and draw nodes
      nodes.forEach(node => {
        node.update();
        node.draw();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [nodeCount]);

  return (
    <div 
      ref={containerRef}
      className="neural-network-container"
    >
      <canvas
        ref={canvasRef}
        className="neural-network-canvas"
      />
    </div>
  );
};

export default NeuralNetwork;