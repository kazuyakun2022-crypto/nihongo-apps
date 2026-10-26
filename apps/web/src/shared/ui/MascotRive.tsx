"use client";

import { useEffect } from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";

export type MascotEmotion = "idle" | "senang" | "sedih" | "kaget" | "berpikir";

const EMOTION_VALUE: Record<MascotEmotion, number> = {
  idle:     0,
  senang:   1,
  sedih:    2,
  kaget:    3,
  berpikir: 4,
};

/**
 * Maskot animasi menggunakan Rive.
 * File .riv harus ada di /public/neko-sensei.riv
 * State machine di Rive harus bernama "EmotionMachine"
 * dengan input "emotion" bertipe Number atau Trigger per state.
 */
export function MascotRive({
  emotion = "idle",
  size = 200,
  className,
}: {
  emotion?: MascotEmotion;
  size?: number;
  className?: string;
}) {
  const { rive, RiveComponent } = useRive({
    src: "/neko-sensei.riv",
    stateMachines: "EmotionMachine",
    autoplay: true,
  });

  // Input "emotion" di Rive state machine — tipe Number
  // 0=idle, 1=senang, 2=sedih, 3=kaget, 4=berpikir
  const emotionInput = useStateMachineInput(rive, "EmotionMachine", "emotion");

  useEffect(() => {
    if (emotionInput) emotionInput.value = EMOTION_VALUE[emotion];
  }, [emotionInput, emotion]);

  return (
    <RiveComponent
      style={{ width: size, height: size }}
      className={className}
      aria-label="Neko-sensei"
    />
  );
}
