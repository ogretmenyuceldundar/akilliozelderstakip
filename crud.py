from sqlmodel import Session, select
from datetime import date, time
from typing import List, Optional
from models import Teacher, Student, Lesson, LessonCreate
from fastapi import HTTPException

def check_overlapping_lesson(session: Session, teacher_id: int, new_date: date, new_start_time: time, new_end_time: time) -> bool:
    statement = select(Lesson).where(
        Lesson.teacher_id == teacher_id,
        Lesson.date == new_date,
        Lesson.status != "Cancelled"
    )
    lessons_on_date = session.exec(statement).all()
    
    for lesson in lessons_on_date:
        if (new_start_time < lesson.end_time) and (new_end_time > lesson.start_time):
            return True
    return False

def create_lesson(session: Session, lesson: LessonCreate) -> Lesson:
    teacher = session.get(Teacher, lesson.teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    student = session.get(Student, lesson.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if lesson.start_time < teacher.working_hours_start or lesson.end_time > teacher.working_hours_end:
        raise HTTPException(
            status_code=400, 
            detail=f"Ders saati öğretmenin çalışma saatleri dışında ({teacher.working_hours_start.strftime('%H:%M')} - {teacher.working_hours_end.strftime('%H:%M')})"
        )

    if check_overlapping_lesson(session, lesson.teacher_id, lesson.date, lesson.start_time, lesson.end_time):
        raise HTTPException(status_code=400, detail="The lesson overlaps with an existing lesson")

    db_lesson = Lesson.model_validate(lesson)
    session.add(db_lesson)
    session.commit()
    session.refresh(db_lesson)
    return db_lesson
