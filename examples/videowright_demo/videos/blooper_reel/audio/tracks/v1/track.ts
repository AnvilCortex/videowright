import type { AudioTrack } from "videowright";

// Blooper reel audio track v1 — VO-only (the narrator's flubbed scratch takes).
// Built by concatenating each segment's per-segment window (see
// ../../originals/voiceovers/v1/). perSegment mirrors those windows so the track
// drives the video: each segment transitions exactly when its window ends and
// the next flub begins.
const track: AudioTrack = {
	audio_file: "./audio/tracks/v1/track.mp3",
	length_s: 87.751,
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
	audio_plan_path: "../../audio_plan.md",
	plan_snapshot_path: "./plan_snapshot.md",
	created_at: "2026-07-17T00:00:00Z",
	notes:
		"VO-only. Voice Asher, model eleven_multilingual_v2. Assembled from 9 per-segment clips, each placed at the start of a window = the segment's visual beat and padded with trailing silence so audio/video stay synced at every boundary. Total 87.75s.",
};

export default track;
