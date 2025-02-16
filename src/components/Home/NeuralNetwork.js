import React, { useEffect, useRef } from "react";

const NeuralNetwork = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    class Node {
      constructor() {
        const section = Math.floor(Math.random() * 4);
        const padding = 100;

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

        const padding = 50;
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

    const nodes = Array.from({ length: 40 }, () => new Node());

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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%'
      }}
    />
  );
};

export default NeuralNetwork; 