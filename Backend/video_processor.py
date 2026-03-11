import cv2
import pytesseract
from PIL import Image
import os
import io

# Tesseract executable is typically installed here on Windows by UB Mannheim installer.
# We set this so `pytesseract` can find it easily.
TESSERACT_PATH = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH
else:
    print(f"Warning: Tesseract not found at {TESSERACT_PATH}. OCR will be disabled.")


def extract_keyframes_and_ocr(video_path: str, diff_threshold: float = 15.0) -> str:
    """
    Extracts keyframes from a video where the screen changes significantly
    (e.g., slide transitions or screen shares) and performs OCR to transcribe the text.

    :param video_path: Path to the video file (.mp4, .mkv, etc.)
    :param diff_threshold: Sensitivity for frame change. Lower = more frames.
    :return: A concatenated string of all unique text found in the video.
    """
    video = cv2.VideoCapture(video_path)
    
    if not video.isOpened():
        raise RuntimeError(f"Could not open video at {video_path}")

    # To calculate frames to skip (e.g. process only 1 frame every second instead of 30 fps)
    fps = video.get(cv2.CAP_PROP_FPS)
    if fps == 0 or fps is None:
        fps = 30.0 # fallback

    frame_interval = int(round(fps)) # 1 frame per second
    
    prev_frame = None
    frame_id = 0
    
    ocr_texts = []
    
    while True:
        # Read the next frame
        ret, frame = video.read()
        if not ret:
            break
            
        # Only process 1 frame per second to speed up and avoid redundant OCR
        if frame_id % frame_interval == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # If it's the very first frame, always run OCR
            if prev_frame is None:
                text = _ocr_frame(gray)
                if text:
                    ocr_texts.append(f"[SLIDE 1]:\n{text}")
            else:
                # Calculate difference from the previous processed keyframe
                diff = cv2.absdiff(prev_frame, gray)
                score = diff.mean()

                # If the difference is above threshold, we consider it a new slide/scene
                if score > diff_threshold:
                    text = _ocr_frame(gray)
                    # Only append if it found some actual text
                    if text and len(text) > 10: 
                        # To avoid capturing identical text due to minor artifacts,
                        # do a simple check against the last added text.
                        # This isn't perfect but helps deduplicate identical slides.
                        last_text = ocr_texts[-1].split("]:\n")[-1] if ocr_texts else ""
                        if text not in last_text:
                            # format it nicely
                            idx = len(ocr_texts) + 1
                            ocr_texts.append(f"[SLIDE {idx}]:\n{text}")
                            
            # Update prev_frame to current gray frame for next comparison
            prev_frame = gray
            
        frame_id += 1

    video.release()
    
    # Return a unified transcript of visual text
    return "\n\n".join(ocr_texts)


def _ocr_frame(gray_frame) -> str:
    """
    Helper function to run Tesseract OCR on a grayscale OpenCV frame.
    Applies preprocessing (scaling and thresholding) to improve accuracy.
    """
    if not os.path.exists(TESSERACT_PATH):
        return ""

    try:
        # 1. Upscale the image (makes text larger for Tesseract to read)
        # Using cubic interpolation which is good for text
        scaled = cv2.resize(gray_frame, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        
        # 2. Apply thresholding to create a high-contrast binary image (black & white only)
        # Otsu's thresholding automatically calculates the optimal threshold value
        _, binarized = cv2.threshold(scaled, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Convert cv2 preprocessed numpy array back to a PIL Image format for Tesseract
        img = Image.fromarray(binarized)
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as e:
        print(f"Warning: OCR failed on frame. Error: {e}")
        return ""
