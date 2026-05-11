'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCompetitionRealtime, adminAction } from '@/hooks/useCompetitionRealtime'
import type { Jury, Group } from '@/types'

function genCode() { return String(Math.floor(1000 + Math.random() * 9000)) }

function Badge({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-white/20'}`} />
}

type Tab = 'yarisma' | 'juriler' | 'gruplar'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>('yarisma')

  const data = useCompetitionRealtime({ admin: authed })

  useEffect(() => {
    if (sessionStorage.getItem('admin_pw')) setAuthed(true)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const res = await fetch('/api/auth/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwInput }),
    })
    setBusy(false)
    if (res.ok) {
      sessionStorage.setItem('admin_pw', pwInput)
      setAuthed(true)
    } else {
      setPwError(true); setTimeout(() => setPwError(false), 2000)
    }
  }

  async function doAction(type: string, payload?: any) {
    setBusy(true)
    try { await adminAction(type, payload); await data.refresh() }
    catch (e: any) { alert('Hata: ' + e.message) }
    finally { setBusy(false) }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-gray-900 border border-white/10 rounded-2xl p-8 w-full max-w-sm flex flex-col gap-4">
          <h1 className="text-white font-bold text-xl text-center">⚙️ Admin Girişi</h1>
          <input type="password" value={pwInput} onChange={e => setPwInput(e.target.value)} placeholder="Şifre"
            className={`bg-gray-800 text-white rounded-xl px-4 py-3 outline-none border ${pwError ? 'border-red-500' : 'border-white/10'}`} />
          {pwError && <p className="text-red-400 text-sm text-center">Yanlış şifre</p>}
          <button type="submit" disabled={busy}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">
            {busy ? 'Kontrol ediliyor...' : 'Giriş Yap'}
          </button>
          <p className="text-white/30 text-xs text-center">Varsayılan şifre: <span className="font-mono">admin</span></p>
        </form>
      </div>
    )
  }

  if (data.loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Yükleniyor...</div>
  )

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'yarisma', label: 'Yarışma', icon: '🏟️' },
    { id: 'juriler', label: 'Jüriler', icon: '👥' },
    { id: 'gruplar', label: 'Gruplar', icon: '📋' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">⚙️ Admin Paneli</h1>
          <p className="text-white/40 text-xs truncate max-w-xs">{data.competition?.name}</p>
        </div>
        <button onClick={() => { sessionStorage.removeItem('admin_pw'); setAuthed(false) }}
          className="text-white/30 hover:text-white/60 text-xs border border-white/10 px-3 py-1.5 rounded-lg">Çıkış</button>
      </div>

      <div className="flex border-b border-white/10 px-4 gap-1 pt-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-t-xl text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}>{t.icon} {t.label}</button>
        ))}
      </div>

      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {tab === 'yarisma' && (
            <motion.div key="yarisma" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <YarismaTab data={data} doAction={doAction} busy={busy} />
            </motion.div>
          )}
          {tab === 'juriler' && (
            <motion.div key="juriler" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <JurilerTab juries={data.juries} doAction={doAction} busy={busy} />
            </motion.div>
          )}
          {tab === 'gruplar' && (
            <motion.div key="gruplar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GruplarTab groups={data.groups} competition={data.competition} doAction={doAction} busy={busy} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   YARIŞMA TAB
═══════════════════════════════════════════════ */
function YarismaTab({ data, doAction, busy }: any) {
  const { competition, groups, juries, currentGroup, currentGroupVotes, hasJuryVoted, allVotesIn } = data
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [pwModal, setPwModal] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwError, setPwError] = useState('')

  async function saveName() {
    await doAction('updateCompName', { name: nameInput.trim() })
    setEditingName(false)
  }

  async function downloadBackup() {
    const pw = sessionStorage.getItem('admin_pw') ?? ''
    const res = await fetch('/api/admin/backup', { headers: { 'X-Admin-Password': pw } })
    if (!res.ok) { alert('İndirme hatası'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `utopya-backup-${new Date().toISOString().slice(0,19).replace(/[:.]/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function uploadBackup(file: File) {
    if (!confirm('TÜM mevcut veri yedek dosyasıyla DEĞİŞTİRİLECEK. Emin misin?')) return
    const text = await file.text()
    let parsed: any
    try { parsed = JSON.parse(text) } catch { alert('Dosya geçerli JSON değil'); return }
    const pw = sessionStorage.getItem('admin_pw') ?? ''
    const res = await fetch('/api/admin/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': pw },
      body: JSON.stringify(parsed),
    })
    if (res.ok) { alert('Yedek başarıyla yüklendi'); window.location.reload() }
    else { const e = await res.json().catch(() => ({})); alert('Hata: ' + (e.error ?? 'bilinmiyor')) }
  }

  async function changePassword() {
    setPwError('')
    if (oldPw !== sessionStorage.getItem('admin_pw')) { setPwError('Mevcut şifre yanlış'); return }
    if (newPw.length < 4) { setPwError('Yeni şifre en az 4 karakter olmalı'); return }
    if (newPw !== newPw2) { setPwError('Yeni şifreler eşleşmiyor'); return }
    try {
      await doAction('changePassword', { newPassword: newPw })
      // Yeni şifre ile sessionStorage'ı güncelle (yoksa sonraki istekler 401 alır)
      sessionStorage.setItem('admin_pw', newPw)
      setPwModal(false); setOldPw(''); setNewPw(''); setNewPw2('')
      alert('Şifre değiştirildi')
    } catch (e: any) {
      setPwError(e.message)
    }
  }

  const pendingGroups = groups.filter((g: any) => g.status === 'pending')
  const lockedGroups = [...groups].filter((g: any) => g.status === 'locked').sort((a: any, b: any) => b.total_score - a.total_score)
  // Aktif grup varsa skor her zaman açıklanabilir/yeniden gösterilebilir
  const canReveal = !!currentGroup
  // pending veya aktif grup varsa çağırılabilir — AMA oylama açıkken bloklanır
  const canCallNext = (pendingGroups.length > 0 || !!currentGroup) && !competition?.voting_open

  function handleReveal() {
    const missing = juries.length - currentGroupVotes.length
    if (!currentGroup?.score_revealed && missing > 0 &&
        !confirm(`${missing} jüri henüz oy vermedi. Yine de sonucu açıklayalım mı?`)) return
    doAction('revealScore')
  }

  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* Şifre Değiştir Modal */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-3">
            <h3 className="text-white font-bold text-lg">🔐 Şifre Değiştir</h3>
            <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="Mevcut şifre"
              className="bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none text-sm focus:border-blue-500" />
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Yeni şifre (en az 4 karakter)"
              className="bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none text-sm focus:border-blue-500" />
            <input type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} placeholder="Yeni şifre tekrar"
              onKeyDown={e => e.key === 'Enter' && changePassword()}
              className="bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none text-sm focus:border-blue-500" />
            {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
            <div className="flex gap-2">
              <button onClick={changePassword} disabled={busy}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition text-sm">
                Değiştir
              </button>
              <button onClick={() => { setPwModal(false); setPwError('') }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-xl transition text-sm">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yarışma Adı + Şifre + Yedek — en üstte */}
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <p className="text-white/40 text-xs uppercase tracking-wider">Yarışma Adı</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={downloadBackup}
              className="text-white/40 hover:text-cyan-400 text-xs px-3 py-1 border border-white/10 hover:border-cyan-500/40 rounded-lg transition">
              💾 Yedek İndir
            </button>
            <label className="text-white/40 hover:text-cyan-400 text-xs px-3 py-1 border border-white/10 hover:border-cyan-500/40 rounded-lg transition cursor-pointer">
              📤 Yedek Yükle
              <input type="file" accept=".json" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadBackup(f); e.target.value = '' }} />
            </label>
            <button onClick={() => setPwModal(true)}
              className="text-white/40 hover:text-amber-400 text-xs px-3 py-1 border border-white/10 hover:border-amber-500/40 rounded-lg transition">
              🔐 Şifre Değiştir
            </button>
          </div>
        </div>
        {editingName ? (
          <div className="flex gap-2">
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
              onKeyDown={e => e.key === 'Enter' && saveName()}
              className="flex-1 bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
            <button onClick={saveName} disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold px-5 rounded-xl transition">
              Kaydet
            </button>
            <button onClick={() => setEditingName(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 rounded-xl transition">
              İptal
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-white font-semibold text-base flex-1">{competition?.name}</p>
            <button onClick={() => { setEditingName(true); setNameInput(competition?.name ?? '') }}
              className="text-white/50 hover:text-blue-400 text-sm px-4 py-2 border border-white/10 hover:border-blue-500/40 rounded-lg transition shrink-0">
              ✏️ Düzenle
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="flex flex-col gap-4">
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider">Durum</p>
            <p className="text-white font-bold mt-1">
              {competition?.status === 'active' ? '🟢 Aktif' : competition?.status === 'finished' ? '🏁 Bitti' : '⏸ Bekliyor'}
            </p>
          </div>
          <button onClick={() => confirm('Tüm oyları ve durumu sıfırla?') && doAction('resetCompetition')}
            disabled={busy} className="text-red-400 hover:text-red-300 text-xs border border-red-400/30 px-3 py-1.5 rounded-lg transition disabled:opacity-40">
            Sıfırla
          </button>
        </div>

        <div className="bg-gray-900 border border-white/10 rounded-2xl p-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Aktif Grup</p>
          <p className="text-white font-bold text-lg">{currentGroup?.name ?? '—'}</p>
          {currentGroup && <p className="text-white/40 text-sm mt-1">Oy: {currentGroupVotes.length} / {juries.length}</p>}
        </div>

        <div className="flex flex-col gap-2">
          {pendingGroups.length > 0 ? (
            <button onClick={() => doAction('callNextGroup')} disabled={busy || !canCallNext}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition text-sm">
              ▶ Sıradaki Grubu Çağır
              <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {[...pendingGroups].sort((a: any, b: any) => a.order_index - b.order_index)[0]?.name}
              </span>
              {competition?.voting_open && (
                <span className="block text-[10px] font-normal opacity-80 mt-0.5">⏸ Önce oylamayı kapat</span>
              )}
            </button>
          ) : currentGroup ? (
            <button onClick={() => {
                if (!confirm(`"${currentGroup.name}" son grup. Yarışmayı bitirelim mi? ${
                  !currentGroup.score_revealed ? '(Skoru otomatik açıklanacak)' : ''
                }`)) return
                doAction('finishCompetition')
              }} disabled={busy || competition?.voting_open}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition text-sm shadow-lg shadow-purple-500/30">
              🏁 Yarışmayı Bitir
              <span className="ml-2 text-xs opacity-70">son grup</span>
              {competition?.voting_open && (
                <span className="block text-[10px] font-normal opacity-80 mt-0.5">⏸ Önce oylamayı kapat</span>
              )}
            </button>
          ) : (
            <button disabled
              className="w-full bg-gray-700 opacity-40 text-white font-bold py-3 rounded-xl text-sm">
              ▶ Sıradaki Grubu Çağır
            </button>
          )}

          {(competition?.status === 'finished' || competition?.show_podium) && (
            <button onClick={() => doAction('unfinishCompetition')}
              disabled={busy}
              className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition text-sm border border-purple-400/30">
              ↺ Geri Al
            </button>
          )}

          {/* Açıklanmamış kilitli grupları toplu aç */}
          {groups.some((g: any) => g.status === 'locked' && !g.score_revealed) && (
            <button onClick={() => doAction('revealAllLocked')} disabled={busy}
              className="w-full bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 font-bold py-2.5 rounded-xl transition border border-orange-500/30 text-sm">
              ✨ Açıklanmamış {groups.filter((g: any) => g.status === 'locked' && !g.score_revealed).length} grubun skorunu aç
            </button>
          )}

          {/* Ana Ekran Görünümü — Podyum & Sıralama her zaman yan yana */}
          {groups.some((g: any) => g.score_revealed) && (
            <div className="bg-gray-900/50 border border-white/10 rounded-2xl p-3">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2 px-1">Ana Ekran Görünümü</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => doAction(competition?.show_podium ? 'hidePodium' : 'showPodium')}
                  disabled={busy}
                  className={`font-bold py-3 rounded-xl transition disabled:opacity-40 text-sm border-2 ${
                    competition?.show_podium
                      ? 'bg-amber-500 hover:bg-amber-400 text-white border-amber-300 shadow-lg shadow-amber-500/30'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                  🏆 Podyum
                  {competition?.show_podium && <span className="block text-[10px] font-normal opacity-70">aktif</span>}
                </button>
                <button onClick={() => doAction('toggleLeaderboard')}
                  disabled={busy}
                  className={`font-bold py-3 rounded-xl transition disabled:opacity-40 text-sm border-2 ${
                    competition?.show_leaderboard
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/30'
                      : 'bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-300 border-cyan-600/30'
                  }`}>
                  📊 Sıralama
                  {competition?.show_leaderboard && <span className="block text-[10px] font-normal opacity-70">aktif</span>}
                </button>
              </div>
            </div>
          )}

          {competition?.status !== 'waiting' && (
            <button onClick={() => doAction('toggleVoting')} disabled={busy || !currentGroup}
              className={`w-full font-bold py-3 rounded-xl transition disabled:opacity-40 text-sm ${
                competition?.voting_open ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}>
              {competition?.voting_open ? '🔒 Oylamayı Kapat' : '🔓 Oylamayı Aç'}
            </button>
          )}

          <button onClick={handleReveal} disabled={busy || !canReveal}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition text-sm">
            {currentGroup?.score_revealed ? '🎬 Animasyonu Yeniden Oynat' : '🎯 Sonucu Açıkla'}
            {!allVotesIn && currentGroup && !currentGroup.score_revealed && (
              <span className="ml-2 text-xs opacity-70">({juries.length - currentGroupVotes.length} eksik)</span>
            )}
          </button>

          {currentGroup?.score_revealed && (
            <button onClick={() => doAction('hideScore')} disabled={busy}
              className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white font-bold py-2 rounded-xl transition text-sm">
              👁 Skoru Gizle
            </button>
          )}

          {currentGroupVotes.length > 0 && (
            <button onClick={() => confirm('Bu grubun TÜM oyları silinsin mi?') && doAction('resetCurrentGroupVotes')}
              disabled={busy} className="w-full text-orange-400 hover:text-orange-300 border border-orange-400/30 font-bold py-2 rounded-xl transition text-sm">
              🔄 Bu Grubun Oylarını Sıfırla
            </button>
          )}

        </div>

        {pendingGroups.length > 0 && (
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Sıra Bekleyenler ({pendingGroups.length})</p>
            <div className="flex flex-col gap-1">
              {pendingGroups.map((g: any) => (
                <p key={g.id} className="text-white/60 text-sm">{g.order_index}. {g.name}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-2 flex flex-col gap-4">
        {currentGroup && (
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Jüri Durumu — {currentGroup.name}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {juries.map((jury: Jury) => {
                const voted = hasJuryVoted(jury.id)
                const vote = currentGroupVotes.find((v: any) => v.jury_id === jury.id)
                return (
                  <div key={jury.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${
                      voted ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-white/5 bg-white/5'
                    }`}>
                    <Badge ok={voted} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate text-xs ${voted ? 'text-white' : 'text-white/40'}`}>{jury.name}</p>
                      {voted && vote && <p className="text-emerald-400 text-xs font-mono">{vote.total}/25</p>}
                    </div>
                    {voted && (
                      <button onClick={() => doAction('resetJuryVote', { juryId: jury.id })} disabled={busy}
                        className="text-red-400/60 hover:text-red-400 text-xs shrink-0" title="Oyu sıfırla">✕</button>
                    )}
                  </div>
                )
              })}
              {juries.length === 0 && (
                <p className="text-white/30 text-sm col-span-full text-center py-4">
                  Henüz jüri yok — &quot;Jüriler&quot; sekmesinden ekleyin
                </p>
              )}
            </div>
          </div>
        )}

        {currentGroup && currentGroupVotes.length > 0 && (
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-4 overflow-x-auto">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Jüri Puanları (Sadece Admin)</p>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-white/30 text-xs">
                  <th className="py-1 pr-3">Jüri</th>
                  {[1,2,3,4,5].map(n => <th key={n} className="py-1 px-2 text-center">K{n}</th>)}
                  <th className="py-1 pl-2 text-center font-bold">Top</th>
                </tr>
              </thead>
              <tbody>
                {currentGroupVotes.map((vote: any) => {
                  const jury = juries.find((j: Jury) => j.id === vote.jury_id)
                  return (
                    <tr key={vote.id} className="border-t border-white/5 text-white/70">
                      <td className="py-1.5 pr-3 font-medium text-white">{jury?.name ?? '—'}</td>
                      {[1,2,3,4,5].map(n => (
                        <td key={n} className="py-1.5 px-2 text-center">{vote[`criteria_${n}`]}</td>
                      ))}
                      <td className="py-1.5 pl-2 text-center font-bold text-amber-400">{vote.total}</td>
                    </tr>
                  )
                })}
                <tr className="border-t border-white/20 text-white font-bold">
                  <td colSpan={6} className="py-1.5 pr-3">Toplam</td>
                  <td className="py-1.5 pl-2 text-center text-amber-400">
                    {currentGroupVotes.reduce((s: number, v: any) => s + v.total, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {lockedGroups.length > 0 && (
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Genel Sıralama</p>
            <div className="flex flex-col gap-2">
              {lockedGroups.map((g: any, i: number) => (
                <div key={g.id} className="flex items-center gap-3 text-sm">
                  <span className="text-white/40 w-6">{i + 1}.</span>
                  <span className="flex-1 text-white">{g.name}</span>
                  <span className="text-amber-400 font-bold font-mono">{g.total_score}</span>
                  <span className="text-white/40 text-xs">({juries.length > 0 ? (g.total_score / juries.length).toFixed(1) : '0'}/25 ort.)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   JÜRİLER TAB
═══════════════════════════════════════════════ */
function JurilerTab({ juries, doAction, busy }: { juries: Jury[]; doAction: any; busy: boolean }) {
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [showCodes, setShowCodes] = useState(true)
  const [bulkCount, setBulkCount] = useState('20')

  async function add() {
    if (!newName.trim()) return
    await doAction('addJury', { name: newName.trim(), code: newCode.trim() || null })
    setNewName(''); setNewCode('')
  }

  async function saveEdit(id: string) {
    await doAction('editJury', { id, name: editName.trim(), code: editCode.trim() || null })
    setEditingId(null)
  }

  const sorted = [...juries].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="flex flex-col gap-6 mt-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <p className="text-white/40 text-xs uppercase tracking-wider w-full">Toplu İşlemler</p>
        <div className="flex gap-2 items-center">
          <input type="number" value={bulkCount} onChange={e => setBulkCount(e.target.value)}
            className="w-20 bg-gray-800 border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none"
            min={1} max={50} />
          <button onClick={() => confirm(`${bulkCount} jüri eklensin?`) && doAction('bulkCreateJuries', { count: parseInt(bulkCount) })}
            disabled={busy} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition">
            Otomatik Oluştur (kodlarla)
          </button>
        </div>
        <button onClick={() => confirm('Tüm kodlar yenilensin?') && doAction('regenerateAllCodes')}
          disabled={busy || juries.length === 0}
          className="bg-amber-600/30 hover:bg-amber-600/50 disabled:opacity-40 text-amber-300 text-sm font-bold px-4 py-2 rounded-xl transition border border-amber-600/30">
          🔄 Tüm Kodları Yenile
        </button>
        <button onClick={() => confirm('TÜM jüriler ve oyları silinsin?') && doAction('clearAllJuries')}
          disabled={busy} className="text-red-400 hover:text-red-300 disabled:opacity-40 text-sm border border-red-400/30 px-4 py-2 rounded-xl transition">
          🗑 Tümünü Sil
        </button>
        <button onClick={() => setShowCodes(s => !s)}
          className="text-white/50 hover:text-white text-sm border border-white/10 px-4 py-2 rounded-xl transition ml-auto">
          {showCodes ? '🙈 Kodları Gizle' : '👁 Kodları Göster'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-white/40 text-xs uppercase tracking-wider">Yeni Jüri Ekle</p>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Jüri adı (ör: Prof. Dr. Ayşe Kaya)"
            onKeyDown={e => e.key === 'Enter' && add()}
            className="bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none text-sm focus:border-blue-500" />
          <div className="flex gap-2">
            <input value={newCode} onChange={e => setNewCode(e.target.value)}
              placeholder="Erişim kodu (boş bırakılabilir)"
              className="flex-1 bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none text-sm focus:border-blue-500 font-mono" />
            <button onClick={() => setNewCode(genCode())}
              className="bg-gray-700 hover:bg-gray-600 text-white/70 px-3 rounded-xl text-sm transition" title="Otomatik kod">
              🎲
            </button>
          </div>
          <button onClick={add} disabled={busy || !newName.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition text-sm">
            + Jüri Ekle
          </button>
        </div>

        {showCodes && juries.length > 0 && (
          <div className="bg-gray-900 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Kod Listesi (Yazdırılabilir)</p>
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
              {sorted.map(j => (
                <div key={j.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/70">{j.name}</span>
                  <span className="text-amber-400 font-mono font-bold">
                    {j.access_code ?? <span className="text-white/20">—</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900 border border-white/10 rounded-2xl p-4">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Jüriler ({juries.length})</p>
        {juries.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">Henüz jüri eklenmemiş</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map(jury => (
              <div key={jury.id} className="border border-white/10 rounded-xl">
                {editingId === jury.id ? (
                  <div className="p-3 flex flex-col gap-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      placeholder="Ad"
                      className="bg-gray-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    <div className="flex gap-2">
                      <input value={editCode} onChange={e => setEditCode(e.target.value)}
                        placeholder="Erişim kodu"
                        className="flex-1 bg-gray-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-mono" />
                      <button onClick={() => setEditCode(genCode())}
                        className="bg-gray-700 hover:bg-gray-600 text-white/70 px-3 rounded-lg text-sm">🎲</button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(jury.id)} disabled={busy}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold py-1.5 rounded-lg transition">
                        Kaydet
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-1.5 rounded-lg transition">
                        İptal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-white/30 text-xs w-6 text-center">{jury.display_order}</span>
                    <span className="flex-1 text-white text-sm font-medium">{jury.name}</span>
                    {showCodes && (
                      <span className="text-amber-400 font-mono text-sm font-bold min-w-[3rem] text-right">
                        {jury.access_code ?? <span className="text-white/20">—</span>}
                      </span>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => doAction('autoCodeJury', { id: jury.id })} disabled={busy}
                        className="text-white/30 hover:text-amber-400 text-xs px-2 py-1 rounded-lg transition" title="Yeni kod">🎲</button>
                      <button onClick={() => { setEditingId(jury.id); setEditName(jury.name); setEditCode(jury.access_code ?? '') }}
                        className="text-white/30 hover:text-blue-400 text-xs px-2 py-1 rounded-lg transition">✏️</button>
                      <button onClick={() => confirm(`"${jury.name}" silinsin?`) && doAction('deleteJury', { id: jury.id })}
                        disabled={busy} className="text-white/30 hover:text-red-400 text-xs px-2 py-1 rounded-lg transition">🗑</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   GRUPLAR TAB
═══════════════════════════════════════════════ */
function GruplarTab({ groups, competition, doAction, busy }: any) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [compName, setCompName] = useState(competition?.name ?? '')
  const [editingComp, setEditingComp] = useState(false)

  const sorted = [...groups].sort((a: Group, b: Group) => a.order_index - b.order_index)

  async function add() {
    if (!newName.trim()) return
    await doAction('addGroup', { name: newName.trim() })
    setNewName('')
  }

  async function saveName(id: string) {
    await doAction('editGroup', { id, name: editName.trim() })
    setEditingId(null)
  }

  async function saveCompName() {
    await doAction('updateCompName', { name: compName.trim() })
    setEditingComp(false)
  }

  const statusLabel: Record<string, string> = { pending: '⏳ Bekliyor', active: '🟢 Aktif', locked: '🔒 Tamamlandı' }
  const statusColor: Record<string, string> = { pending: 'text-white/40', active: 'text-emerald-400', locked: 'text-blue-400' }

  return (
    <div className="flex flex-col gap-6 mt-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-4">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Yarışma Adı</p>
        {editingComp ? (
          <div className="flex gap-2">
            <input value={compName} onChange={e => setCompName(e.target.value)}
              className="flex-1 bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500" />
            <button onClick={saveCompName} disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold px-4 rounded-xl">Kaydet</button>
            <button onClick={() => setEditingComp(false)}
              className="bg-gray-700 text-white text-sm px-4 rounded-xl">İptal</button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-white font-medium text-sm">{competition?.name}</p>
            <button onClick={() => { setEditingComp(true); setCompName(competition?.name ?? '') }}
              className="text-white/30 hover:text-blue-400 text-xs px-3 py-1.5 border border-white/10 rounded-lg transition shrink-0">
              ✏️ Düzenle
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-white/40 text-xs uppercase tracking-wider">Yeni Grup Ekle</p>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Grup / Bölüm adı"
            onKeyDown={e => e.key === 'Enter' && add()}
            className="bg-gray-800 border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none text-sm focus:border-blue-500" />
          <button onClick={add} disabled={busy || !newName.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition text-sm">
            + Grup Ekle
          </button>
        </div>

        <div className="bg-gray-900 border border-white/10 rounded-2xl p-4 grid grid-cols-3 gap-3 content-center">
          {(['pending','active','locked'] as const).map(s => (
            <div key={s} className="text-center">
              <p className="text-2xl font-black text-white">{groups.filter((g: Group) => g.status === s).length}</p>
              <p className={`text-xs mt-1 ${statusColor[s]}`}>{statusLabel[s]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-white/10 rounded-2xl p-4">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Gruplar ({groups.length})</p>
        {groups.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">Henüz grup eklenmemiş</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((group: any, idx: number) => (
              <div key={group.id} className={`border rounded-xl ${
                group.status === 'active' ? 'border-emerald-500/40' :
                group.status === 'locked' ? 'border-blue-500/20' : 'border-white/10'
              }`}>
                {editingId === group.id ? (
                  <div className="p-3 flex gap-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="flex-1 bg-gray-800 border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    <button onClick={() => saveName(group.id)} disabled={busy}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm px-4 rounded-lg">✓</button>
                    <button onClick={() => setEditingId(null)}
                      className="bg-gray-700 text-white text-sm px-4 rounded-lg">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => doAction('moveGroup', { id: group.id, dir: 'up' })} disabled={busy || idx === 0}
                        className="text-white/20 hover:text-white/60 disabled:opacity-20 text-xs leading-none">▲</button>
                      <button onClick={() => doAction('moveGroup', { id: group.id, dir: 'down' })} disabled={busy || idx === sorted.length - 1}
                        className="text-white/20 hover:text-white/60 disabled:opacity-20 text-xs leading-none">▼</button>
                    </div>
                    <span className="text-white/30 text-xs w-5 text-center">{group.order_index}</span>
                    <span className={`flex-1 text-sm font-medium ${
                      group.status === 'active' ? 'text-emerald-300' :
                      group.status === 'locked' ? 'text-blue-300' : 'text-white'
                    }`}>{group.name}</span>
                    <span className={`text-xs ${statusColor[group.status]}`}>{statusLabel[group.status]}</span>
                    {group.score_revealed && (
                      <span className="text-amber-400 text-xs font-mono font-bold">{group.total_score}pt</span>
                    )}
                    <div className="flex gap-1">
                      {group.status !== 'pending' && (
                        <button onClick={() => confirm('Grubun skoru ve oyları silinsin?') && doAction('resetGroupScore', { id: group.id })}
                          disabled={busy} className="text-white/20 hover:text-orange-400 text-xs px-1.5 py-1 rounded-lg transition" title="Skoru sıfırla">🔄</button>
                      )}
                      <button onClick={() => { setEditingId(group.id); setEditName(group.name) }}
                        className="text-white/30 hover:text-blue-400 text-xs px-2 py-1 rounded-lg transition">✏️</button>
                      <button onClick={() => confirm(`"${group.name}" silinsin?`) && doAction('deleteGroup', { id: group.id })}
                        disabled={busy} className="text-white/30 hover:text-red-400 text-xs px-2 py-1 rounded-lg transition">🗑</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
