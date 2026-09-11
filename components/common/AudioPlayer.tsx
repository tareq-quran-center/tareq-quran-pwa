"use client";

import React from "react";
import { CompactAudioPlayer, CompactAudioPlayerProps } from "./CompactAudioPlayer";

export type AudioPlayerProps = CompactAudioPlayerProps;

export function AudioPlayer(props: AudioPlayerProps) {
  return <CompactAudioPlayer {...props} />;
}
