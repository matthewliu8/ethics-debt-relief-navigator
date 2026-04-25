#Playing around with this code
#Interprets graphs

from flask import Flask, request, jsonify
from flask_cors import CORS
#import openai
import fitz
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
from dotenv import load_dotenv
import os
from groq import Groq

load_dotenv()
print(os.getenv("OPENAI_API_KEY"))
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "https://ethics-debt-relief-navigator-qmgu.vercel.app"]}})

def get_summary(prompt):
    response = client.chat.completions.create(
        model = "groq/compound-mini",
        messages = [
            {"role": "system","content": """You are a financial assistant helping users understand their bills.

            RULES:
                - Output ONLY in the format below
                - Do NOT add introductions or extra commentary
                - Do NOT make up numbers or missing information
                - Do NOT talk about information that is not indidicated by the format
                - If information is missing, say "Not provided"

            FORMAT:
                - Total amount due:
             
                - Due date:
             
                - Key charges:
                    - ...
             
                - Unusual or high charges:
                    - ...
             
                - Analysis of graphs:
                    - ...
             
                - Summary:
                    - ...

            GUIDELINES:
                - Clearly identify total balance and due date
                - Group similar charges together in the "Key charges"
                - Explain charges in simple, everyday language
                - Keep responses concise and structured
                - When outputting, output an empty line between each line
                - If there are multiple charges for similar chargers, indicate with a + then show what it totals to
                - Flag anything unusually high or suspicious in the "Unusual or high charges"
                - If none of the information is provided, simply say "Unable to analyze information. File may be unclear or contain unsuitable information. Please try again."
                - Follow these guidelines to determine unusual or high charges:
                    - If the bill shows usage (for example: kWh, gallons, minutes, etc.), check: low usage but high cost and/or normal usage but unusually high rate
                    - Look for charges that don't usually appear (e.g., "service fee," "adjustment," "penalty")
                    - Same fee listed multiple times
                    - Sudden fees unrelated to usage (e.g., "Late fees", "Reconnection charge", "Installation/service charge")
                    - If taxes are approximately 30 percent to 50 percent of subtotal
                    - If there is nothing unusual or no high charges, simply say "All charges are reasonable"
             
        
            """
            }, #end of messaging
            {"role" : "user", "content" : prompt},
        ],
        max_tokens = 1000
    )
    return response.choices[0].message.content


@app.route('/summarize/pdf', methods=['POST'])
def summarize_pdf():
    try:
        file = request.files['file']
        doc = fitz.open(stream=file.read(), filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()

        if not text.strip():
            return jsonify({"error": "No readable text found in PDF"}), 400

        prompt = f"Summarize the following pdf content:\n{text}"
        summary = get_summary(prompt)
        return jsonify({"summary": summary})

    except Exception as e:
        print(f"PDF Error: {e}")          
        return jsonify({"error": str(e)}), 500  

#create def for images
@app.route('/summarize/image', methods=['POST'])
def summarize_image():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']
        image = Image.open(file.stream)
        image = image.convert("RGB")

        width, height = image.size
        if width < 1000:
            scale = 1000 / width
            image = image.resize(
                (int(width * scale), int(height * scale)),
                Image.LANCZOS
            )
            
        image = image.convert("L")

        from PIL import ImageEnhance, ImageFilter
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.5)

        image = image.filter(ImageFilter.SHARPEN)
        image = image.filter(ImageFilter.SHARPEN) #2x effect

        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(image, config=custom_config)

        print(f"OCR extracted {len(text)} characters")  
        print(f"First 200 chars: {text[:200]}")          

        if not text.strip():
            return jsonify({"error": "No readable text found in image. Try uploading a clearer photo or use PDF instead."}), 400

        prompt = f"Summarize the following bill:\n{text}"
        summary = get_summary(prompt)
        return jsonify({"summary": summary})

    except Exception as e:
        print(f"Image Error: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/analyze/health', methods=['POST'])
def analyze_health():
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')

        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400

        summary = get_summary(prompt)
        return jsonify({"analysis": summary})

    except Exception as e:
        print(f"Health analysis error: {e}")
        return jsonify({"error": str(e)}), 500
        
    
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host='0.0.0.0', port=port) 
    