import type { Voiceover } from "videowright";

// Blooper VO v1. Each segment's flubbed line was generated as a separate
// ElevenLabs clip and placed at the start of a per-segment window sized to the
// segment's visual beat (see generate.sh + windows.tsv), then concatenated with
// trailing silence. perSegment values are those window lengths, so audio and
// video stay locked at every segment boundary.
const voiceover: Voiceover = {
	audio_file: "./audio.mp3",
	provider: "elevenlabs",
	eleven_labs_voice_id: "tMvyQtpCVQ0DkixuYm6J", // Asher
	timing: {
		perSegment: {
			"bl-cold-open": [10.4],
			"bl-title-card": [9.8],
			"bl-web-tech-gallery": [11.6],
			"bl-interactive-dev": [9.6],
			"bl-pixel-perfect-export": [9.8],
			"bl-voiceover-sync": [9.313],
			"bl-any-coding-agent": [7.4],
			"bl-install-cta": [10.2],
			"bl-gag-reel-outro": [9.638],
		},
	},
	notes:
		"9 flubbed 'scratch takes', ElevenLabs (Asher, eleven_multilingual_v2), generated per-line from provider_script.md. Each clip sits at the start of a window = the segment's visual-beat length, padded with silence (windows.tsv). Two lines run past their beat (voiceover-sync, outro) so those windows = line+0.35s; their segments hold the final frame to match. Total 87.75s.",
};

export default voiceover;
