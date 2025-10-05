// components/ThreePlanets.js
'use client';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function ThreePlanets() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    
    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Texture loader
    const textureLoader = new THREE.TextureLoader();

    // Crear planetas con diferentes texturas
    const createPlanet = (radius, textureUrl, position, rotationSpeed) => {
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const texture = textureLoader.load(textureUrl);
      const material = new THREE.MeshBasicMaterial({ 
        map: texture 
      });
      const planet = new THREE.Mesh(geometry, material);
      
      planet.position.set(position.x, position.y, position.z);
      scene.add(planet);
      
      return { planet, rotationSpeed };
    };

    // Planetas con texturas (puedes reemplazar las URLs con tus propias texturas)
    const planets = [
      createPlanet(1.5, '/textures/earth.jpg', { x: -4, y: 1, z: -8 }, 0.005),
      createPlanet(1.2, '/textures/mars.jpg', { x: 4, y: -1, z: -10 }, 0.008),
      createPlanet(2.0, '/textures/jupiter.jpg', { x: 0, y: 2, z: -12 }, 0.003),
      createPlanet(1.8, '/textures/saturn.jpg', { x: -3, y: -2, z: -6 }, 0.006)
    ];

    // Animación
    function animate() {
      requestAnimationFrame(animate);
      
      planets.forEach(({ planet, rotationSpeed }) => {
        planet.rotation.y += rotationSpeed;
      });
      
      renderer.render(scene, camera);
    }
    
    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      const container = mountRef.current; // capture ref value at cleanup time
      window.removeEventListener('resize', handleResize);
      if (container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 pointer-events-none z-0" />;
}