/**
 * Audio Recorder — Optional voice recording for poem lines
 *
 * Contributors can record themselves reading their line aloud (10s max).
 * Uses MediaRecorder API with webm/opus codec.
 */

import { supabase } from './supabase.js';

var MAX_DURATION = 10; // seconds
var MIME_TYPE = 'audio/webm;codecs=opus';

/**
 * initAudioRecorder(options) — sets up recording UI and returns a controller.
 *
 * options.recordBtn     — the record button element
 * options.btnText       — the button text span
 * options.wave          — the waveform container (has canvas child)
 * options.canvas        — the canvas element for waveform
 * options.preview       — the preview container (play, duration, delete)
 * options.playBtn       — play button
 * options.durationEl    — duration display span
 * options.deleteBtn     — delete recording button
 * options.timerEl       — countdown timer span
 *
 * Returns { getBlob, reset, destroy }
 */
export function initAudioRecorder(options) {
  var recordBtn = options.recordBtn;
  var btnText = options.btnText;
  var wave = options.wave;
  var canvas = options.canvas;
  var preview = options.preview;
  var playBtn = options.playBtn;
  var durationEl = options.durationEl;
  var deleteBtn = options.deleteBtn;
  var timerEl = options.timerEl;

  var mediaRecorder = null;
  var audioChunks = [];
  var audioBlob = null;
  var audioUrl = null;
  var audioElement = null;
  var isRecording = false;
  var timerInterval = null;
  var elapsed = 0;
  var stream = null;
  var analyser = null;
  var animFrame = null;

  // Check browser support
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (recordBtn) recordBtn.parentElement.parentElement.style.display = 'none';
    return { getBlob: function () { return null; }, reset: function () {}, destroy: function () {} };
  }

  function formatTime(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function drawWaveform(analyserNode, canvasEl) {
    if (!canvasEl || !analyserNode) return;
    var ctx = canvasEl.getContext('2d');
    var bufferLength = analyserNode.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    function draw() {
      if (!isRecording) return;
      animFrame = requestAnimationFrame(draw);
      analyserNode.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#79B939';
      ctx.beginPath();

      var sliceWidth = canvasEl.width / bufferLength;
      var x = 0;
      for (var i = 0; i < bufferLength; i++) {
        var v = dataArray[i] / 128.0;
        var y = (v * canvasEl.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvasEl.width, canvasEl.height / 2);
      ctx.stroke();
    }
    draw();
  }

  function startTimer() {
    elapsed = 0;
    if (timerEl) {
      timerEl.hidden = false;
      timerEl.textContent = formatTime(0) + ' / ' + formatTime(MAX_DURATION);
    }
    timerInterval = setInterval(function () {
      elapsed++;
      if (timerEl) {
        timerEl.textContent = formatTime(elapsed) + ' / ' + formatTime(MAX_DURATION);
      }
      if (elapsed >= MAX_DURATION) {
        stopRecording();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  async function startRecording() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.warn('Microphone access denied:', err);
      return;
    }

    // Check MIME type support, fall back if needed
    var mimeType = MediaRecorder.isTypeSupported(MIME_TYPE) ? MIME_TYPE : '';

    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType: mimeType } : undefined);

    mediaRecorder.addEventListener('dataavailable', function (e) {
      if (e.data.size > 0) audioChunks.push(e.data);
    });

    mediaRecorder.addEventListener('stop', function () {
      audioBlob = new Blob(audioChunks, { type: mimeType || 'audio/webm' });
      audioUrl = URL.createObjectURL(audioBlob);
      audioElement = new Audio(audioUrl);

      // Show preview
      if (wave) wave.hidden = true;
      if (timerEl) timerEl.hidden = true;
      if (preview) preview.hidden = false;
      if (durationEl) durationEl.textContent = formatTime(elapsed);

      // Stop all tracks
      if (stream) {
        stream.getTracks().forEach(function (t) { t.stop(); });
        stream = null;
      }
    });

    // Set up analyser for waveform
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    mediaRecorder.start();
    isRecording = true;

    // UI updates
    if (recordBtn) recordBtn.classList.add('is-recording');
    if (btnText) btnText.textContent = 'Stop';
    if (wave) wave.hidden = false;
    if (preview) preview.hidden = true;

    startTimer();
    drawWaveform(analyser, canvas);
  }

  function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    isRecording = false;
    stopTimer();

    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }

    mediaRecorder.stop();

    // UI updates
    if (recordBtn) recordBtn.classList.remove('is-recording');
    if (btnText) btnText.textContent = 'Record';
  }

  function reset() {
    if (isRecording) stopRecording();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioBlob = null;
    audioUrl = null;
    audioElement = null;
    audioChunks = [];
    elapsed = 0;

    if (preview) preview.hidden = true;
    if (wave) wave.hidden = true;
    if (timerEl) timerEl.hidden = true;
    if (recordBtn) recordBtn.classList.remove('is-recording');
    if (btnText) btnText.textContent = 'Record';
  }

  function destroy() {
    reset();
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
  }

  // Wire up button events
  if (recordBtn) {
    recordBtn.addEventListener('click', function () {
      if (isRecording) {
        stopRecording();
      } else {
        // If there's already a recording, reset first
        if (audioBlob) reset();
        startRecording();
      }
    });
  }

  if (playBtn) {
    var isPlaying = false;
    playBtn.addEventListener('click', function () {
      if (!audioElement) return;
      if (isPlaying) {
        audioElement.pause();
        audioElement.currentTime = 0;
        playBtn.textContent = '\u25B6';
        isPlaying = false;
      } else {
        audioElement.play();
        playBtn.textContent = '\u25A0';
        isPlaying = true;
        audioElement.addEventListener('ended', function handler() {
          playBtn.textContent = '\u25B6';
          isPlaying = false;
          audioElement.removeEventListener('ended', handler);
        });
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', function () {
      reset();
    });
  }

  return {
    getBlob: function () { return audioBlob; },
    reset: reset,
    destroy: destroy,
  };
}

/**
 * uploadAudio(blob, lineId) — uploads audio blob to Supabase Storage.
 * Bucket: 'audio', path: lines/{lineId}.webm
 */
export async function uploadAudio(blob, lineId) {
  if (!blob || !lineId) return null;

  var path = 'lines/' + lineId + '.webm';

  var { error } = await supabase.storage
    .from('audio')
    .upload(path, blob, {
      contentType: 'audio/webm',
      upsert: false,
    });

  if (error) {
    console.error('Audio upload failed:', error);
    return null;
  }

  return path;
}

/**
 * getAudioUrl(lineId) — returns the public URL for a line's audio.
 */
export function getAudioUrl(lineId) {
  var { data } = supabase.storage
    .from('audio')
    .getPublicUrl('lines/' + lineId + '.webm');

  return data ? data.publicUrl : null;
}

/**
 * checkAudioExists(lineId) — checks if audio exists for a given line.
 * Uses a HEAD-like request to Supabase Storage.
 */
export async function checkAudioExists(lineId) {
  var url = getAudioUrl(lineId);
  if (!url) return false;

  try {
    var response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (e) {
    return false;
  }
}
