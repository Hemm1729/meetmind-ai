import whisper
import subprocess
import os
import shutil
import imageio_ffmpeg

FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
ffmpeg_dir = os.path.dirname(FFMPEG_PATH)
ffmpeg_alias = os.path.join(ffmpeg_dir, "ffmpeg.exe")

# Copy the binary so Whisper can discover 'ffmpeg.exe' by standard name
if not os.path.exists(ffmpeg_alias):
    try:
        shutil.copyfile(FFMPEG_PATH, ffmpeg_alias)
    except Exception:
        pass

# Add ffmpeg to PATH so Whisper can find it internally
os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

def extract_audio_from_video(video_path: str) -> str:
    audio_path = video_path + ".wav"
    cmd = [
        FFMPEG_PATH,
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        "-y",
        audio_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ffmpeg audio extraction warning: {result.stderr}")
        return video_path  # If ffmpeg extraction fails, just let Whisper try the raw WebM/MP4
    return audio_path


print("Loading global Whisper model into memory for fast live inference...")
_whisper_model = whisper.load_model("base")
print("Whisper model loaded.")

def transcribe_audio(audio_path: str) -> dict:
    try:
        result = _whisper_model.transcribe(audio_path, verbose=False)
        return {
            "text": result["text"],
            "segments": [
                {
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"]
                }
                for seg in result.get("segments", [])
            ]
        }
    except Exception as e:
        print(f"Warning: Whisper failed to process audio (possibly no audio track). Error: {e}")
        return {
            "text": "",
            "segments": []
        }


def transcribe_video(file_path: str) -> dict:
    ext = os.path.splitext(file_path)[1].lower()

    if ext in [".mp4", ".mkv", ".avi", ".mov", ".webm"]:
        audio_path = extract_audio_from_video(file_path)
    else:
        audio_path = file_path

    result = transcribe_audio(audio_path)

    if audio_path != file_path and os.path.exists(audio_path):
        os.remove(audio_path)

    return result