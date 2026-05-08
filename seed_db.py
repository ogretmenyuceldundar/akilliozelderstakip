from sqlmodel import Session
from datetime import date, time
from database import engine, create_db_and_tables
from models import Teacher, Student, Lesson

def seed_data():
    create_db_and_tables()
    with Session(engine) as session:
        # Check if already seeded
        existing_teacher = session.get(Teacher, 1)
        if existing_teacher:
            print("Veritabanı zaten dolu.")
            return

        print("Örnek veriler ekleniyor...")
        
        teacher = Teacher(
            name="Ahmet Hoca", 
            email="ahmet@example.com", 
            hourly_rate=500, 
            working_hours_start=time(9, 0), 
            working_hours_end=time(18, 0)
        )
        session.add(teacher)
        session.commit()
        session.refresh(teacher)

        student1 = Student(
            name="Ali Yılmaz", 
            parent_name="Veli Yılmaz", 
            parent_password="veli",
            remaining_lessons=8, 
            teacher_id=teacher.id
        )
        student2 = Student(
            name="Ayşe Kaya", 
            parent_name="Fatma Kaya", 
            parent_password="fatma",
            remaining_lessons=10, 
            teacher_id=teacher.id
        )
        session.add(student1)
        session.add(student2)
        session.commit()
        session.refresh(student1)
        session.refresh(student2)

        lesson1 = Lesson(
            date=date(2026, 5, 7), 
            start_time=time(14, 0), 
            end_time=time(15, 0), 
            status="Planned", 
            payment_status="Pending", 
            teacher_id=teacher.id, 
            student_id=student1.id
        )
        lesson2 = Lesson(
            date=date(2026, 5, 8), 
            start_time=time(16, 0), 
            end_time=time(17, 0), 
            status="Planned", 
            payment_status="Pending", 
            teacher_id=teacher.id, 
            student_id=student2.id
        )
        session.add(lesson1)
        session.add(lesson2)
        session.commit()

        print("Örnek veriler başarıyla eklendi!")

if __name__ == "__main__":
    seed_data()
