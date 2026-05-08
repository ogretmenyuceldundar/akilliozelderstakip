import os
from dotenv import load_dotenv

load_dotenv()

def generate_student_report(raw_notes: str, student_name: str, lesson_topic: str = "Ders") -> str:
    """
    Calls the Gemini API to generate a professional report for the parents
    based on the raw notes from the teacher.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return f"SİSTEM UYARISI: GEMINI_API_KEY ortam değişkeni bulunamadı. Lütfen API anahtarınızı ayarlayın.\n\nTaslak Notlar: {raw_notes}"
    
    prompt = f"""
    Sen profesyonel, kibar ve veli ile iletişim kurmakta usta bir öğretmensin. 
    Aşağıda sana verilen taslak notları kullanarak, veliye gönderilmek üzere özenli, yapıcı ve profesyonel bir öğrenci gelişim raporu hazırla.
    Raporun dili Türkçe olacak. Çok uzun olmamasına, okunaklı ve teşvik edici olmasına dikkat et.

    Öğrenci Adı: {student_name}
    Ders Konusu: {lesson_topic}
    Öğretmenin Taslak Notları: 
    {raw_notes}
    
    Lütfen sadece rapor metnini oluştur, başkaca bir açıklama ekleme.
    """
    
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        return response.text
    except ImportError:
        # Eski kütüphane ile dene (fallback)
        try:
            import google.generativeai as genai_old
            genai_old.configure(api_key=api_key)
            model = genai_old.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Rapor oluşturulurken bir hata oluştu: {str(e)}"
    except Exception as e:
        return f"Rapor oluşturulurken bir hata oluştu: {str(e)}"
