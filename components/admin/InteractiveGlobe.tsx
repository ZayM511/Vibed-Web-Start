"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, RotateCw, ZoomIn, ZoomOut, Play, Pause } from "lucide-react";

interface UserMarker {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  count: number;
}

interface InteractiveGlobeProps {
  markers?: UserMarker[];
}

export function InteractiveGlobe({ markers = [] }: InteractiveGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Sample data if no markers provided
  const sampleMarkers: UserMarker[] = markers.length > 0 ? markers : [
    { lat: 40.7128, lng: -74.0060, city: "New York", country: "USA", count: 145 },
    { lat: 51.5074, lng: -0.1278, city: "London", country: "UK", count: 89 },
    { lat: 35.6762, lng: 139.6503, city: "Tokyo", country: "Japan", count: 234 },
    { lat: 48.8566, lng: 2.3522, city: "Paris", country: "France", count: 67 },
    { lat: -33.8688, lng: 151.2093, city: "Sydney", country: "Australia", count: 56 },
    { lat: 37.7749, lng: -122.4194, city: "San Francisco", country: "USA", count: 178 },
    { lat: 55.7558, lng: 37.6173, city: "Moscow", country: "Russia", count: 92 },
    { lat: 1.3521, lng: 103.8198, city: "Singapore", country: "Singapore", count: 124 },
    { lat: 52.5200, lng: 13.4050, city: "Berlin", country: "Germany", count: 73 },
    { lat: 19.4326, lng: -99.1332, city: "Mexico City", country: "Mexico", count: 45 },
  ];

  const activeMarkers = markers.length > 0 ? markers : sampleMarkers;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2 + offset.x;
    const centerY = height / 2 + offset.y;
    const radius = Math.min(width, height) * 0.35 * zoom;

    const animate = () => {
      // Clear canvas with dark background
      ctx.fillStyle = "#0a0a1f";
      ctx.fillRect(0, 0, width, height);

      // Draw space background
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 1.5;
        ctx.fillRect(x, y, size, size);
      }

      // Draw globe glow
      const glowGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.3);
      glowGradient.addColorStop(0, "rgba(0, 240, 255, 0.2)");
      glowGradient.addColorStop(0.5, "rgba(0, 240, 255, 0.1)");
      glowGradient.addColorStop(1, "transparent");
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Draw globe sphere
      const globeGradient = ctx.createRadialGradient(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        radius * 0.1,
        centerX,
        centerY,
        radius
      );
      globeGradient.addColorStop(0, "rgba(20, 30, 80, 0.9)");
      globeGradient.addColorStop(0.5, "rgba(10, 20, 60, 0.8)");
      globeGradient.addColorStop(1, "rgba(5, 10, 40, 0.9)");

      ctx.fillStyle = globeGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw globe grid
      ctx.strokeStyle = "rgba(0, 240, 255, 0.3)";
      ctx.lineWidth = 1;

      // Latitude lines
      for (let lat = -80; lat <= 80; lat += 20) {
        ctx.beginPath();
        for (let lng = -180; lng <= 180; lng += 2) {
          const adjustedLng = lng + rotation;
          const x = centerX + radius * Math.cos((lat * Math.PI) / 180) * Math.sin((adjustedLng * Math.PI) / 180);
          const y = centerY + radius * Math.sin((lat * Math.PI) / 180);
          const z = radius * Math.cos((lat * Math.PI) / 180) * Math.cos((adjustedLng * Math.PI) / 180);

          if (z > 0) {
            if (lng === -180) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Longitude lines
      for (let lng = 0; lng < 360; lng += 20) {
        ctx.beginPath();
        for (let lat = -90; lat <= 90; lat += 2) {
          const adjustedLng = lng + rotation;
          const x = centerX + radius * Math.cos((lat * Math.PI) / 180) * Math.sin((adjustedLng * Math.PI) / 180);
          const y = centerY + radius * Math.sin((lat * Math.PI) / 180);
          const z = radius * Math.cos((lat * Math.PI) / 180) * Math.cos((adjustedLng * Math.PI) / 180);

          if (z > 0) {
            if (lat === -90) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Draw user markers
      activeMarkers.forEach((marker) => {
        const adjustedLng = marker.lng + rotation;
        const x = centerX + radius * Math.cos((marker.lat * Math.PI) / 180) * Math.sin((adjustedLng * Math.PI) / 180);
        const y = centerY + radius * Math.sin((marker.lat * Math.PI) / 180);
        const z = radius * Math.cos((marker.lat * Math.PI) / 180) * Math.cos((adjustedLng * Math.PI) / 180);

        if (z > 0) {
          // Pulsing glow
          const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7;
          const markerSize = Math.max(4, Math.log(marker.count) * 2) * pulse;

          // Outer glow
          const markerGlow = ctx.createRadialGradient(x, y, 0, x, y, markerSize * 3);
          markerGlow.addColorStop(0, "rgba(0, 255, 136, 0.6)");
          markerGlow.addColorStop(1, "transparent");
          ctx.fillStyle = markerGlow;
          ctx.beginPath();
          ctx.arc(x, y, markerSize * 3, 0, Math.PI * 2);
          ctx.fill();

          // Inner marker
          ctx.fillStyle = "#00ff88";
          ctx.beginPath();
          ctx.arc(x, y, markerSize, 0, Math.PI * 2);
          ctx.fill();

          // Marker border
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // Update rotation
      if (isRotating) {
        setRotation((prev) => (prev + 0.3) % 360);
      }
    };

    const animationId = requestAnimationFrame(function loop() {
      animate();
      requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(animationId);
  }, [rotation, isRotating, zoom, offset, activeMarkers]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/20 overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-white">Real-Time Global Activity</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsRotating(!isRotating)}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              {isRotating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setZoom(Math.min(zoom + 0.2, 2))}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setOffset({ x: 0, y: 0 });
                setZoom(1);
                setRotation(0);
              }}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-auto rounded-lg cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          {/* Active locations list */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {activeMarkers.slice(0, 10).map((marker, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white text-sm font-medium">{marker.city}</span>
                </div>
                <p className="text-white/60 text-xs">{marker.count} active</p>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
