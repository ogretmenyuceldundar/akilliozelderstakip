from enum import Enum
from datetime import date, time
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class LessonStatus(str, Enum):
    PLANNED = "Planned"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class PaymentStatus(str, Enum):
    PENDING = "Pending"
    PAID = "Paid"

class TeacherBase(SQLModel):
    name: str
    email: str = Field(index=True, unique=True)
    hourly_rate: float
    working_hours_start: time
    working_hours_end: time

class Teacher(TeacherBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    students: List["Student"] = Relationship(back_populates="teacher")
    lessons: List["Lesson"] = Relationship(back_populates="teacher")

class StudentBase(SQLModel):
    name: str
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None
    parent_password: Optional[str] = None
    remaining_lessons: int = Field(default=0)
    teacher_id: int = Field(foreign_key="teacher.id")

class Student(StudentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher: Optional[Teacher] = Relationship(back_populates="students")
    lessons: List["Lesson"] = Relationship(back_populates="student")

class LessonBase(SQLModel):
    date: date
    start_time: time
    end_time: time
    status: LessonStatus = Field(default=LessonStatus.PLANNED)
    payment_status: PaymentStatus = Field(default=PaymentStatus.PENDING)
    teacher_id: int = Field(foreign_key="teacher.id")
    student_id: int = Field(foreign_key="student.id")

class Lesson(LessonBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    teacher: Optional[Teacher] = Relationship(back_populates="lessons")
    student: Optional[Student] = Relationship(back_populates="lessons")
    reports: List["Report"] = Relationship(back_populates="lesson")

class ReportBase(SQLModel):
    lesson_id: int = Field(foreign_key="lesson.id")
    raw_notes: str
    generated_report: str

class Report(ReportBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    lesson: Optional["Lesson"] = Relationship(back_populates="reports")

# DTOs
class TeacherCreate(TeacherBase):
    pass

class TeacherRead(TeacherBase):
    id: int

class StudentCreate(StudentBase):
    parent_password: Optional[str] = None

class StudentUpdate(SQLModel):
    name: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None
    remaining_lessons: Optional[int] = None
    teacher_id: Optional[int] = None

class StudentRead(StudentBase):
    id: int
    parent_password: Optional[str] = None

class LessonCreate(LessonBase):
    pass

class LessonRead(LessonBase):
    id: int

class ReportCreate(SQLModel):
    raw_notes: str

class ReportRead(ReportBase):
    id: int

class LessonUpdateStatus(SQLModel):
    status: LessonStatus

class PackagePurchase(SQLModel):
    amount: int

class ParentLogin(SQLModel):
    student_id: int
    password: str
