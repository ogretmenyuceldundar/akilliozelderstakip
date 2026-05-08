from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List

from database import create_db_and_tables, get_session, engine
from models import Teacher, TeacherCreate, TeacherRead, Student, StudentCreate, StudentRead, StudentUpdate, Lesson, LessonCreate, LessonRead, Report, ReportCreate, ReportRead, LessonUpdateStatus, PackagePurchase, ParentLogin
from crud import create_lesson as crud_create_lesson
from ai_services import generate_student_report
from datetime import time

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    # Varsayılan öğretmen yoksa oluştur
    with Session(engine) as session:
        existing = session.get(Teacher, 1)
        if not existing:
            teacher = Teacher(
                name="Yücel Dündar",
                email="ogretmen@example.com",
                hourly_rate=500,
                working_hours_start=time(9, 0),
                working_hours_end=time(22, 0)
            )
            session.add(teacher)
            session.commit()
    yield

app = FastAPI(title="Akıllı Özel Ders Yönetim Paneli", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://akilliozelderstakip-fy2t.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/teachers/", response_model=TeacherRead)
def create_teacher(teacher: TeacherCreate, session: Session = Depends(get_session)):
    db_teacher = Teacher.model_validate(teacher)
    session.add(db_teacher)
    session.commit()
    session.refresh(db_teacher)
    return db_teacher

@app.get("/teachers/", response_model=List[TeacherRead])
def read_teachers(session: Session = Depends(get_session)):
    teachers = session.exec(select(Teacher)).all()
    return teachers

@app.post("/students/", response_model=StudentRead)
def create_student(student: StudentCreate, session: Session = Depends(get_session)):
    db_student = Student.model_validate(student)
    session.add(db_student)
    session.commit()
    session.refresh(db_student)
    return db_student

@app.get("/students/", response_model=List[StudentRead])
def read_students(session: Session = Depends(get_session)):
    students = session.exec(select(Student)).all()
    return students

@app.patch("/students/{student_id}", response_model=StudentRead)
def update_student(student_id: int, student_update: StudentUpdate, session: Session = Depends(get_session)):
    db_student = session.get(Student, student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student_data = student_update.model_dump(exclude_unset=True)
    for key, value in student_data.items():
        setattr(db_student, key, value)
        
    session.add(db_student)
    session.commit()
    session.refresh(db_student)
    return db_student

@app.delete("/students/{student_id}")
def delete_student(student_id: int, session: Session = Depends(get_session)):
    db_student = session.get(Student, student_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # 1. Önce bu öğrenciye ait derslerin raporlarını silelim
    statement_reports = select(Report).join(Lesson).where(Lesson.student_id == student_id)
    reports_to_delete = session.exec(statement_reports).all()
    for report in reports_to_delete:
        session.delete(report)
    
    # 2. Sonra bu öğrenciye ait tüm dersleri silelim
    statement_lessons = select(Lesson).where(Lesson.student_id == student_id)
    lessons_to_delete = session.exec(statement_lessons).all()
    for lesson in lessons_to_delete:
        session.delete(lesson)
        
    # 3. Son olarak öğrenciyi silelim
    session.delete(db_student)
    session.commit()
    return {"message": "Student and all related records deleted successfully"}

@app.post("/lessons/", response_model=LessonRead)
def create_lesson(lesson: LessonCreate, session: Session = Depends(get_session)):
    return crud_create_lesson(session=session, lesson=lesson)

@app.get("/lessons/", response_model=List[LessonRead])
def read_lessons(session: Session = Depends(get_session)):
    lessons = session.exec(select(Lesson)).all()
    return lessons

@app.post("/lessons/{lesson_id}/generate-report", response_model=ReportRead)
def generate_report_for_lesson(lesson_id: int, report_create: ReportCreate, session: Session = Depends(get_session)):
    lesson = session.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
        
    student = session.get(Student, lesson.student_id)
    
    generated_text = generate_student_report(
        raw_notes=report_create.raw_notes,
        student_name=student.name,
        lesson_topic="Özel Ders"
    )
    
    db_report = Report(
        lesson_id=lesson_id,
        raw_notes=report_create.raw_notes,
        generated_report=generated_text
    )
    session.add(db_report)
    session.commit()
    session.refresh(db_report)
    return db_report

@app.get("/lessons/{lesson_id}/reports", response_model=List[ReportRead])
def read_reports(lesson_id: int, session: Session = Depends(get_session)):
    reports = session.exec(select(Report).where(Report.lesson_id == lesson_id)).all()
    return reports

@app.get("/students/{student_id}/reports", response_model=List[ReportRead])
def read_student_all_reports(student_id: int, session: Session = Depends(get_session)):
    # Join Report -> Lesson -> Student
    statement = select(Report).join(Lesson).where(Lesson.student_id == student_id)
    reports = session.exec(statement).all()
    return reports

@app.post("/students/{student_id}/buy-package", response_model=StudentRead)
def buy_package(student_id: int, package: PackagePurchase, session: Session = Depends(get_session)):
    student = session.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student.remaining_lessons += package.amount
    session.add(student)
    session.commit()
    session.refresh(student)
    return student
@app.post("/parent-login", response_model=StudentRead)
def parent_login(data: ParentLogin, session: Session = Depends(get_session)):
    student = session.get(Student, data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if student.parent_password != data.password:
        raise HTTPException(status_code=401, detail="Invalid parent password")
    return student


@app.patch("/lessons/{lesson_id}/status", response_model=LessonRead)
def update_lesson_status(lesson_id: int, status_update: LessonUpdateStatus, session: Session = Depends(get_session)):
    lesson = session.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
        
    student = session.get(Student, lesson.student_id)
    
    # If lesson status changes to Completed, deduct from package
    if lesson.status != status_update.status:
        if status_update.status == "Completed":
            if student.remaining_lessons <= 0:
                raise HTTPException(status_code=400, detail="Öğrencinin paketinde kalan ders hakkı yok.")
            student.remaining_lessons -= 1
            session.add(student)
        
        # If it was completed but reverted to Planned or Cancelled, refund the lesson
        elif lesson.status == "Completed" and status_update.status in ["Planned", "Cancelled"]:
            student.remaining_lessons += 1
            session.add(student)
            
    lesson.status = status_update.status
    session.add(lesson)
    session.commit()
    session.refresh(lesson)
    return lesson
