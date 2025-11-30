"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Play, Pause, RotateCcw, Trophy, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

interface Enemy extends GameObject {
  points: number;
}

interface Bullet extends GameObject {
  dy: number;
}

export function SpaceInvadersGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "paused" | "gameover">("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);

  const gameDataRef = useRef({
    player: { x: 375, y: 550, width: 50, height: 30, active: true },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    enemyBullets: [] as Bullet[],
    enemyDirection: 1,
    enemySpeed: 1,
    lastEnemyShot: 0,
    keys: {} as Record<string, boolean>,
  });

  const initEnemies = useCallback((levelNum: number) => {
    const enemies: Enemy[] = [];
    const rows = Math.min(3 + Math.floor(levelNum / 2), 6);
    const cols = 8;
    const enemyWidth = 40;
    const enemyHeight = 30;
    const spacing = 10;
    const startX = 100;
    const startY = 50;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        enemies.push({
          x: startX + col * (enemyWidth + spacing),
          y: startY + row * (enemyHeight + spacing),
          width: enemyWidth,
          height: enemyHeight,
          active: true,
          points: (rows - row) * 10,
        });
      }
    }

    gameDataRef.current.enemies = enemies;
    gameDataRef.current.enemySpeed = 1 + (levelNum - 1) * 0.3;
  }, []);

  const resetGame = useCallback(() => {
    setScore(0);
    setLevel(1);
    setLives(3);
    gameDataRef.current.player = { x: 375, y: 550, width: 50, height: 30, active: true };
    gameDataRef.current.bullets = [];
    gameDataRef.current.enemyBullets = [];
    gameDataRef.current.enemyDirection = 1;
    initEnemies(1);
  }, [initEnemies]);

  const nextLevel = useCallback(() => {
    const newLevel = level + 1;
    setLevel(newLevel);
    gameDataRef.current.bullets = [];
    gameDataRef.current.enemyBullets = [];
    gameDataRef.current.enemyDirection = 1;
    gameDataRef.current.player.x = 375;
    initEnemies(newLevel);
  }, [level, initEnemies]);

  useEffect(() => {
    const stored = localStorage.getItem("spaceInvadersHighScore");
    if (stored) setHighScore(parseInt(stored));
    initEnemies(1);
  }, [initEnemies]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("spaceInvadersHighScore", score.toString());
    }
  }, [score, highScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      gameDataRef.current.keys[e.key] = true;
      if (e.key === " " && gameState === "playing") {
        e.preventDefault();
        const player = gameDataRef.current.player;
        if (gameDataRef.current.bullets.length < 3) {
          gameDataRef.current.bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 10,
            dy: -8,
            active: true,
          });
        }
      }
      if (e.key === "p" || e.key === "P") {
        if (gameState === "playing") setGameState("paused");
        else if (gameState === "paused") setGameState("playing");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameDataRef.current.keys[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== "playing") return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      const data = gameDataRef.current;

      // Clear canvas
      ctx.fillStyle = "#0a0a1f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw stars background
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      for (let i = 0; i < 50; i++) {
        const x = (i * 137.5) % canvas.width;
        const y = (i * 97.3) % canvas.height;
        ctx.fillRect(x, y, 1, 1);
      }

      // Update player
      if (data.keys["ArrowLeft"] && data.player.x > 0) {
        data.player.x -= 5;
      }
      if (data.keys["ArrowRight"] && data.player.x < canvas.width - data.player.width) {
        data.player.x += 5;
      }

      // Draw player
      ctx.fillStyle = "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(data.player.x + data.player.width / 2, data.player.y);
      ctx.lineTo(data.player.x, data.player.y + data.player.height);
      ctx.lineTo(data.player.x + data.player.width, data.player.y + data.player.height);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Update and draw player bullets
      data.bullets = data.bullets.filter((bullet) => {
        bullet.y += bullet.dy;

        if (bullet.y < 0) return false;

        // Check enemy collision
        for (const enemy of data.enemies) {
          if (
            enemy.active &&
            bullet.x < enemy.x + enemy.width &&
            bullet.x + bullet.width > enemy.x &&
            bullet.y < enemy.y + enemy.height &&
            bullet.y + bullet.height > enemy.y
          ) {
            enemy.active = false;
            setScore((s) => s + enemy.points);
            return false;
          }
        }

        ctx.fillStyle = "#00ff88";
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 10;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.shadowBlur = 0;
        return true;
      });

      // Update enemies
      let shouldChangeDirection = false;
      const activeEnemies = data.enemies.filter((e) => e.active);

      for (const enemy of activeEnemies) {
        enemy.x += data.enemyDirection * data.enemySpeed;
        if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
          shouldChangeDirection = true;
        }
      }

      if (shouldChangeDirection) {
        data.enemyDirection *= -1;
        for (const enemy of activeEnemies) {
          enemy.y += 20;
        }
      }

      // Draw enemies
      for (const enemy of data.enemies) {
        if (!enemy.active) continue;

        ctx.fillStyle = "#ff0055";
        ctx.shadowColor = "#ff0055";
        ctx.shadowBlur = 10;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.shadowBlur = 0;

        // Enemy eyes
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(enemy.x + 8, enemy.y + 8, 6, 6);
        ctx.fillRect(enemy.x + 26, enemy.y + 8, 6, 6);
      }

      // Enemy shooting
      if (Date.now() - data.lastEnemyShot > 1000 && activeEnemies.length > 0) {
        const shooter = activeEnemies[Math.floor(Math.random() * activeEnemies.length)];
        data.enemyBullets.push({
          x: shooter.x + shooter.width / 2 - 2,
          y: shooter.y + shooter.height,
          width: 4,
          height: 10,
          dy: 4,
          active: true,
        });
        data.lastEnemyShot = Date.now();
      }

      // Update and draw enemy bullets
      data.enemyBullets = data.enemyBullets.filter((bullet) => {
        bullet.y += bullet.dy;

        if (bullet.y > canvas.height) return false;

        // Check player collision
        if (
          bullet.x < data.player.x + data.player.width &&
          bullet.x + bullet.width > data.player.x &&
          bullet.y < data.player.y + data.player.height &&
          bullet.y + bullet.height > data.player.y
        ) {
          setLives((l) => {
            const newLives = l - 1;
            if (newLives <= 0) {
              setGameState("gameover");
            }
            return newLives;
          });
          return false;
        }

        ctx.fillStyle = "#ffaa00";
        ctx.shadowColor = "#ffaa00";
        ctx.shadowBlur = 10;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.shadowBlur = 0;
        return true;
      });

      // Check if level complete
      if (activeEnemies.length === 0) {
        nextLevel();
      }

      // Check game over (enemies reached bottom)
      for (const enemy of activeEnemies) {
        if (enemy.y + enemy.height > data.player.y) {
          setGameState("gameover");
          break;
        }
      }
    };

    const intervalId = setInterval(gameLoop, 1000 / 60);
    return () => clearInterval(intervalId);
  }, [gameState, nextLevel]);

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/20 overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-white">Space Invaders</CardTitle>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-white">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span>High: {highScore}</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <Zap className="h-4 w-4 text-green-400" />
              <span>Level: {level}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-auto rounded-lg border-2 border-cyan-500/30"
          />

          {/* Game overlay */}
          {gameState !== "playing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-lg flex items-center justify-center"
            >
              <div className="text-center space-y-6 p-8">
                {gameState === "menu" && (
                  <>
                    <h2 className="text-4xl font-bold text-cyan-400 mb-4">Space Invaders</h2>
                    <div className="space-y-2 text-white/80 text-sm mb-6">
                      <p>Use Arrow Keys to move</p>
                      <p>Press SPACE to shoot</p>
                      <p>Press P to pause</p>
                    </div>
                    <Button
                      size="lg"
                      onClick={() => {
                        resetGame();
                        setGameState("playing");
                      }}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                      <Play className="mr-2 h-5 w-5" />
                      Start Game
                    </Button>
                  </>
                )}

                {gameState === "paused" && (
                  <>
                    <h2 className="text-4xl font-bold text-cyan-400 mb-4">Paused</h2>
                    <div className="flex gap-4">
                      <Button
                        size="lg"
                        onClick={() => setGameState("playing")}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      >
                        <Play className="mr-2 h-5 w-5" />
                        Resume
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => {
                          resetGame();
                          setGameState("menu");
                        }}
                        className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                      >
                        <RotateCcw className="mr-2 h-5 w-5" />
                        Main Menu
                      </Button>
                    </div>
                  </>
                )}

                {gameState === "gameover" && (
                  <>
                    <h2 className="text-4xl font-bold text-red-400 mb-4">Game Over!</h2>
                    <div className="space-y-2 mb-6">
                      <p className="text-2xl text-white">Score: {score}</p>
                      <p className="text-xl text-white/70">Level: {level}</p>
                      {score === highScore && score > 0 && (
                        <p className="text-yellow-400 font-bold">New High Score!</p>
                      )}
                    </div>
                    <Button
                      size="lg"
                      onClick={() => {
                        resetGame();
                        setGameState("playing");
                      }}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                    >
                      <RotateCcw className="mr-2 h-5 w-5" />
                      Play Again
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* HUD */}
          {gameState === "playing" && (
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
              <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-cyan-500/30">
                <p className="text-cyan-400 text-sm font-mono">Score: {score}</p>
              </div>
              <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-green-500/30">
                <p className="text-green-400 text-sm font-mono">Level: {level}</p>
              </div>
              <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-red-500/30">
                <p className="text-red-400 text-sm font-mono">
                  Lives: {"❤️".repeat(lives)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setGameState("paused")}
                className="bg-black/60 backdrop-blur-sm text-white hover:bg-white/10 border border-white/20"
              >
                <Pause className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
