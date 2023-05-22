import {
  appWindow,
  currentMonitor,
  LogicalPosition,
} from "@tauri-apps/api/window";
import { readTextFile, exists, BaseDirectory } from "@tauri-apps/api/fs";

import { Stage, Sprite, Text } from "@pixi/react";
import {
  Assets,
  Spritesheet,
  TextStyle,
  SCALE_MODES,
  BaseTexture,
} from "pixi.js";
import { useEffect, useRef, useState } from "react";

BaseTexture.defaultOptions.scaleMode = SCALE_MODES.NEAREST;

const FRAME_SIZE = 200;
const MAX_MOVE_AMOUNT = 800;

const MESSAGES = [
  "You're doing great!",
  "Keep it up!",
  "You're the best!",
  "Amazing job!",
  "You're doing great sweetie!",
];

export function MainPage() {
  const [frog, setFrog] = useState<Spritesheet | undefined>(undefined);
  const [direction, setDirection] = useState<-1 | 1>(1);
  const [goal, setGoal] = useState(0);
  const [possibleMessages, setPossibleMessages] = useState([...MESSAGES]);
  const [message, setMessage] = useState("");
  const [currentFrame, setCurrentFrame] = useState<"idle" | "preJump" | "jump">(
    "idle"
  );
  const x = useRef(0);

  const newGoal = async () => {
    const monitor = await currentMonitor();
    if (!monitor) return;

    const newXGoal = Math.min(
      Math.max(
        FRAME_SIZE,
        Math.floor(x.current + (Math.random() - 0.5) * MAX_MOVE_AMOUNT)
      ),
      (monitor.size.width - FRAME_SIZE) / await appWindow.scaleFactor()
    );

    if (Math.abs(newXGoal - x.current) < 50) {
      await newGoal();
      return;
    }

    setDirection(newXGoal > x.current ? 1 : -1);
    setGoal(newXGoal);
  };

  const showMessage = () => {
    setMessage(possibleMessages[Math.floor(Math.random() * MESSAGES.length)]);
  };

  const clearMessage = () => {
    setMessage("");
  };

  // Load frog and set initial window position
  useEffect(() => {
    // Don't block clicks
    appWindow.setIgnoreCursorEvents(true);

    // Reset values while loading
    x.current = 0;
    clearMessage();

    // Load sprite sheet meta
    Assets.load<Spritesheet>("/images/frog/frog.json").then((asset) => {
      setFrog(asset);
      console.log(asset.textures);
    });

    // Load in user defined messages if they exist
    exists("frog.txt", { dir: BaseDirectory.Document }).then(
      async (doesExist) => {
        if (!doesExist) return;

        const text = await readTextFile("frog.txt", {
          dir: BaseDirectory.Document,
        });
        const messages = text
          .replaceAll("\r", "")
          .split("\n")
          .filter((line) => line.trim() !== "");
        console.log(messages);
        if (messages.length > 0) {
          setPossibleMessages(messages);
        }
      }
    );

    // Get the current monitor and set the window position. Start new goal.
    currentMonitor().then(async (monitor) => {
      if (!monitor) {
        appWindow.close();
        return;
      }

      let startPos = Math.min(
        Math.max(FRAME_SIZE, Math.floor(Math.random() * monitor.size.width)),
        monitor.size.width - FRAME_SIZE
      ) / await appWindow.scaleFactor();
      x.current = startPos;
      await appWindow.setPosition(
        new LogicalPosition(startPos, (monitor.size.height - FRAME_SIZE) / await appWindow.scaleFactor())
      );
      await newGoal();
    });
  }, []);

  // Setup interval to move towards goal
  useEffect(() => {
    // Store timeouts and interval to clear later
    let timeouts: number[] = [];
    const interval = setInterval(async () => {
      // Move x towards goal
      x.current += 4 * direction;

      // Do some simple maths to determine which frame to show
      const anim = 22;
      let frame = (x.current % anim) / anim;

      // Show said frame
      if (frame < 0.3) {
        setCurrentFrame("idle");
      } else if (frame < 0.66) {
        setCurrentFrame("preJump");
      } else {
        setCurrentFrame("jump");
      }

      // Move the window to the new position
      await appWindow.setPosition(
        new LogicalPosition(x.current, (await appWindow.innerPosition()).y)
      );

      // If we reached the goal, reset, show a message, then start again after a timeout
      if (Math.abs(x.current - goal) < 4) {
        clearInterval(interval);
        setCurrentFrame("idle");

        timeouts.push(
          setTimeout(() => {
            showMessage();
          }, 500)
        );
        timeouts.push(
          setTimeout(async () => {
            clearMessage();
            await newGoal();
          }, 5000 + Math.random() * 5000)
        );
      }
    }, 100);

    // If we re-render, clear everything
    return () => {
      clearInterval(interval);
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [goal]);

  return (
    <Stage
      width={FRAME_SIZE}
      height={FRAME_SIZE}
      options={{ backgroundAlpha: 0 }}
    >
      <Text
        text={message}
        style={
          new TextStyle({
            fill: 0xffffff,
            dropShadow: true,
            dropShadowBlur: 12,
            dropShadowDistance: 0,
            align: "center",
            wordWrap: true,
            wordWrapWidth: 200,
          })
        }
        anchor={{ x: 0.5, y: 1 }}
        x={100}
        y={160}
      />
      {frog && (
        <Sprite
          texture={frog.textures[currentFrame]}
          scale={{ x: 5 * direction, y: 5 }}
          anchor={{ x: 0.5, y: 1 }}
          x={100}
          y={200}
        />
      )}
    </Stage>
  );
}
