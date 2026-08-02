// Harness self-test. Must score exactly zero delta on every column.
({ analyzeFrameMan }) => (frame, opts) => analyzeFrameMan(frame, opts)
