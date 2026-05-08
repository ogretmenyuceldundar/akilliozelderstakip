import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function App() {
  const [user, setUser] = useState(null) // { role: 'teacher' } | { role: 'parent', studentId: 1 }
  const [lessons, setLessons] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' | 'reports'
  
  // Modals state
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [showAddLesson, setShowAddLesson] = useState(false)

  // Report state
  const [reportNotes, setReportNotes] = useState("")
  const [generating, setGenerating] = useState(false)
  const [reportResult, setReportResult] = useState(null)
  
  // Reports View State
  const [studentReports, setStudentReports] = useState([])
  const [selectedStudentForReports, setSelectedStudentForReports] = useState(null)

  // Form states
  const [studentForm, setStudentForm] = useState({ name: "", parent_name: "", parent_password: "", remaining_lessons: 0 })
  const [newLesson, setNewLesson] = useState({ date: "", start_time: "", end_time: "", student_id: "" })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const resLessons = await fetch(`${API_URL}/lessons/`)
      const dataLessons = await resLessons.json()
      setLessons(dataLessons.sort((a, b) => new Date(b.date + 'T' + b.start_time) - new Date(a.date + 'T' + a.start_time)))

      const resStudents = await fetch(`${API_URL}/students/`)
      const dataStudents = await resStudents.json()
      setStudents(dataStudents)
    } catch (err) {
      console.error("Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setCurrentView('dashboard')
    setSelectedStudentForReports(null)
  }

  // --- Login Screen Component ---
  const LoginView = () => {
    const [selectedRole, setSelectedRole] = useState('teacher')
    const [parentStudentId, setParentStudentId] = useState('')
    const [parentPassword, setParentPassword] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async (e) => {
      e.preventDefault()
      if (selectedRole === 'teacher') {
        if (password === 'teacher123') { // Örnek şifre
          setUser({ role: 'teacher' })
        } else {
          alert("Hatalı öğretmen şifresi!")
        }
      } else {
        if (!parentStudentId) {
          alert("Lütfen öğrencinizi seçin.")
          return
        }
        if (!parentPassword) {
          alert("Lütfen veli şifresini girin.")
          return
        }
        try {
          const res = await fetch(`${API_URL}/parent-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: parentStudentId, password: parentPassword })
          })
          if (res.ok) {
            setUser({ role: 'parent', studentId: parentStudentId })
            fetchStudentReports(parentStudentId)
          } else {
            const err = await res.json()
            alert(err.detail || 'Veli giriş hatası')
          }
        } catch (e) {
          console.error(e)
          alert('Veli giriş hatası')
        }
      }
    }

    return (
      <div className="login-container">
        <div className="login-card">
          <h1>✨ Akıllı Özel Ders</h1>
          <p style={{color: 'var(--text-muted)'}}>Lütfen giriş yapmak için rolünüzü seçin</p>
          
          <div className="role-selector">
            <div className={`role-option ${selectedRole === 'teacher' ? 'active' : ''}`} onClick={() => setSelectedRole('teacher')}>
              <span className="role-icon">👨‍🏫</span>
              <span>Öğretmen</span>
            </div>
            <div className={`role-option ${selectedRole === 'parent' ? 'active' : ''}`} onClick={() => setSelectedRole('parent')}>
              <span className="role-icon">👪</span>
              <span>Veli</span>
            </div>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            {selectedRole === 'teacher' ? (
              <div className="form-group">
                <label>Öğretmen Şifresi</label>
                <input type="password" placeholder="Şifrenizi girin..." value={password} onChange={e => setPassword(e.target.value)} required />
                <p style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>Not: Demo için şifre: teacher123</p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Öğrenci Seçin</label>
                  <select value={parentStudentId} onChange={e => setParentStudentId(Number(e.target.value))} required>
                    <option value="">-- İsminizi Seçin --</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} - Veli Girişi</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Veli Şifresi</label>
                  <input type="password" placeholder="Şifrenizi girin..." value={parentPassword} onChange={e => setParentPassword(e.target.value)} required />
                </div>
              </>
            )}
            <button type="submit" className="btn" style={{width: '100%', marginTop: '1rem', justifyContent: 'center'}}>Giriş Yap</button>
          </form>
        </div>
      </div>
    )
  }

  const updateLessonStatus = async (lessonId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/lessons/${lessonId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) await fetchData()
    } catch (err) { console.error(err) }
  }

  const completeLesson = async (lesson) => {
    await updateLessonStatus(lesson.id, "Completed")
    setSelectedLesson(lesson)
  }

  const cancelLesson = async (lessonId) => {
    if (confirm("Bu dersi iptal etmek istediğinize emin misiniz?")) {
      await updateLessonStatus(lessonId, "Cancelled")
    }
  }

  const generateReport = async () => {
    try {
      setGenerating(true)
      const res = await fetch(`${API_URL}/lessons/${selectedLesson.id}/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_notes: reportNotes })
      })
      const data = await res.json()
      setReportResult(data.generated_report)
    } catch (err) {
      alert("Rapor oluşturulurken hata oluştu.")
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveStudent = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...studentForm, teacher_id: 1, remaining_lessons: studentForm.remaining_lessons === '' ? 0 : Number(studentForm.remaining_lessons) }
      
      const url = editingStudent 
        ? `${API_URL}/students/${editingStudent.id}`
        : `${API_URL}/students/`
      
      const res = await fetch(url, {
        method: editingStudent ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setShowStudentModal(false)
        setEditingStudent(null)
        setStudentForm({ name: "", parent_name: "", parent_password: "", remaining_lessons: 0 })
        fetchData()
      }
    } catch (err) { console.error(err) }
  }

  const deleteStudent = async (id) => {
    if (confirm("Bu öğrenciyi ve tüm verilerini silmek istediğinize emin misiniz?")) {
      try {
        const res = await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' })
        if (res.ok) fetchData()
      } catch (err) { console.error(err) }
    }
  }

  const openEditStudent = (student) => {
    setEditingStudent(student)
    setStudentForm({
      name: student.name,
      parent_name: student.parent_name || "",
      parent_password: student.parent_password || "",
      remaining_lessons: student.remaining_lessons
    })
    setShowStudentModal(true)
  }

  const handleAddLesson = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_URL}/lessons/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...newLesson, 
          teacher_id: 1,
          start_time: newLesson.start_time + ":00", 
          end_time: newLesson.end_time + ":00" 
        })
      })
      if (res.ok) {
        setShowAddLesson(false)
        setNewLesson({ date: "", start_time: "", end_time: "", student_id: "" })
        fetchData()
      }
    } catch (err) { console.error(err) }
  }

  const fetchStudentReports = async (studentId) => {
    try {
      const res = await fetch(`${API_URL}/students/${studentId}/reports`)
      const data = await res.json()
      setStudentReports(data)
      setSelectedStudentForReports(students.find(s => s.id === studentId))
    } catch (err) { console.error(err) }
  }

  const getStudentName = (id) => {
    const s = students.find(x => x.id === id)
    return s ? s.name : `Öğrenci #${id}`
  }

  if (!user) {
    return <LoginView />
  }

  return (
    <div className="container">
      <header>
        <div style={{display: 'flex', alignItems: 'center', gap: '2rem'}}>
          <h1 onClick={() => user.role === 'teacher' ? setCurrentView('dashboard') : null} style={{cursor: 'pointer'}}>Akıllı Özel Ders</h1>
          {user.role === 'teacher' && (
            <nav className="nav-links">
              <div className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>Dashboard</div>
              <div className={`nav-item ${currentView === 'reports' ? 'active' : ''}`} onClick={() => { setCurrentView('reports'); setSelectedStudentForReports(null); }}>Tüm Raporlar</div>
            </nav>
          )}
        </div>
        <div className="action-buttons">
          {user.role === 'teacher' && (
            <>
              <button className="btn btn-secondary" onClick={() => { setEditingStudent(null); setStudentForm({name:"", parent_name:"", parent_password:"", remaining_lessons: 0}); setShowStudentModal(true); }}>+ Yeni Öğrenci</button>
              <button className="btn btn-secondary" onClick={() => setShowAddLesson(true)}>+ Ders Planla</button>
            </>
          )}
          <button className="btn btn-secondary logout-btn" onClick={handleLogout}>🚪 Çıkış Yap</button>
        </div>
      </header>

      {user.role === 'teacher' ? (
        currentView === 'dashboard' ? (
          <div className="dashboard-grid">
            <div className="card">
              <h2>👤 Öğrencilerim</h2>
              {loading ? <p>Yükleniyor...</p> : (
                students.length === 0 ? <p className="empty-state">Henüz öğrenci bulunmuyor.</p> :
                <div className="stat-group">
                  {students.map(s => (
                    <div key={s.id} className="stat-item">
                      <div style={{display: 'flex', flexDirection: 'column'}}>
                        <span className="stat-label" style={{color: 'var(--text-main)', fontWeight: 600}}>{s.name}</span>
                        <span className="stat-label" style={{fontSize: '0.8rem'}}>{s.remaining_lessons} Ders Kaldı</span>
                      </div>
                      <div className="student-actions">
                        <button className="btn btn-secondary btn-icon" onClick={() => openEditStudent(s)} title="Düzenle">✏️</button>
                        <button className="btn btn-secondary btn-icon btn-danger" onClick={() => deleteStudent(s.id)} title="Sil">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2>📅 Ders Programı</h2>
              {loading ? <p>Yükleniyor...</p> : (
                lessons.length === 0 ? <p className="empty-state">Planlanmış ders bulunmuyor.</p> :
                <div className="lesson-list">
                  {lessons.map(l => (
                    <div key={l.id} className="lesson-item">
                      <div className="lesson-info">
                        <span className="lesson-student">{getStudentName(l.student_id)}</span>
                        <span className="lesson-time">🗓️ {l.date} | ⏰ {l.start_time.substring(0,5)} - {l.end_time.substring(0,5)}</span>
                      </div>
                      <div className="action-buttons">
                        <span className={`badge ${l.status}`}>{l.status === 'Planned' ? 'Bekliyor' : l.status === 'Completed' ? 'Tamamlandı' : 'İptal Edildi'}</span>
                        {l.status === 'Planned' && (
                          <>
                            <button className="btn" onClick={() => completeLesson(l)}>Bitir</button>
                            <button className="btn btn-secondary btn-danger" onClick={() => cancelLesson(l.id)}>İptal</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card">
            {!selectedStudentForReports ? (
              <>
                <h2>📑 Öğrenci Raporları</h2>
                <div className="stat-group" style={{marginTop: '1.5rem'}}>
                  {students.map(s => (
                    <div key={s.id} className="stat-item" style={{cursor: 'pointer'}} onClick={() => fetchStudentReports(s.id)}>
                      <span className="stat-label" style={{color: 'var(--text-main)', fontWeight: 600}}>{s.name}</span>
                      <span className="btn btn-secondary">Raporları Gör →</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <button className="btn btn-secondary back-btn" onClick={() => setSelectedStudentForReports(null)}>← Geri Dön</button>
                <h2>📑 {selectedStudentForReports.name} - Tüm Raporlar</h2>
                <div className="reports-container">
                  {studentReports.map(r => (
                    <div key={r.id} className="report-card">
                      <div className="report-header"><span style={{fontWeight: 600}}>Ders Raporu</span></div>
                      <div className="report-body">{r.generated_report}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      ) : (
        /* --- Parent View --- */
        <div className="card">
          <h2>📑 Merhaba, Hoşgeldiniz</h2>
          <p>{getStudentName(user.studentId)} isimli öğrencinin gelişim raporları aşağıdadır:</p>
          {studentReports.length === 0 ? <p className="empty-state">Henüz rapor bulunmuyor.</p> : (
            <div className="reports-container" style={{marginTop: '2rem'}}>
              {studentReports.map(r => (
                <div key={r.id} className="report-card">
                  <div className="report-header">
                    <span style={{fontWeight: 600}}>AI Gelişim Raporu</span>
                  </div>
                  <div className="report-body">{r.generated_report}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Report Modal */}
      {selectedLesson && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>✨ AI Destekli Veli Raporu</h3>
            {!reportResult ? (
              <>
                <p>Ders tamamlandı. Kısa notlarınızı girin:</p>
                <textarea placeholder="Örn: Bugün matematikten kesirler konusunu işledik..." value={reportNotes} onChange={(e) => setReportNotes(e.target.value)} />
                <div className="action-buttons">
                  <button className="btn" onClick={generateReport} disabled={generating || !reportNotes}>{generating ? 'Oluşturuluyor...' : 'Raporu Oluştur'}</button>
                  <button className="btn btn-secondary" onClick={() => setSelectedLesson(null)}>Kapat</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>{reportResult}</div>
                <button className="btn" onClick={() => { setSelectedLesson(null); setReportResult(null); setReportNotes(""); fetchData(); }}>Kapat</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modals for Student & Lesson (Only for Teacher) */}
      {showStudentModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingStudent ? '👤 Öğrenci Düzenle' : '👤 Yeni Öğrenci Ekle'}</h3>
            <form onSubmit={handleSaveStudent}>
              <div className="form-group"><label>Öğrenci Adı</label><input required type="text" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} /></div>
              <div className="form-group"><label>Veli Adı</label><input type="text" value={studentForm.parent_name} onChange={e => setStudentForm({...studentForm, parent_name: e.target.value})} /></div>
              <div className="form-group"><label>Veli Şifresi</label><input type="text" value={studentForm.parent_password} onChange={e => setStudentForm({...studentForm, parent_password: e.target.value})} /></div>
              <div className="form-group"><label>Paket (Kalan Ders)</label><input required type="number" min="0" value={studentForm.remaining_lessons} onChange={e => setStudentForm({...studentForm, remaining_lessons: e.target.value === '' ? '' : parseInt(e.target.value)})} /></div>
              <div className="action-buttons"><button type="submit" className="btn">Kaydet</button><button type="button" className="btn btn-secondary" onClick={() => { setShowStudentModal(false); setEditingStudent(null); }}>İptal</button></div>
            </form>
          </div>
        </div>
      )}

      {showAddLesson && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>📅 Yeni Ders Planla</h3>
            <form onSubmit={handleAddLesson}>
              <div className="form-group"><label>Öğrenci</label><select required value={newLesson.student_id} onChange={e => setNewLesson({...newLesson, student_id: parseInt(e.target.value)})}>
                <option value="">-- Seç --</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
              <div className="form-group"><label>Tarih</label><input required type="date" value={newLesson.date} onChange={e => setNewLesson({...newLesson, date: e.target.value})} /></div>
              <div className="form-group"><label>Başlangıç</label><input required type="time" value={newLesson.start_time} onChange={e => setNewLesson({...newLesson, start_time: e.target.value})} /></div>
              <div className="form-group"><label>Bitiş</label><input required type="time" value={newLesson.end_time} onChange={e => setNewLesson({...newLesson, end_time: e.target.value})} /></div>
              <div className="action-buttons"><button type="submit" className="btn">Kaydet</button><button type="button" className="btn btn-secondary" onClick={() => setShowAddLesson(false)}>İptal</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
