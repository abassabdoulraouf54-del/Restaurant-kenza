import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import Modal from '@/components/admin/Modal'
import { btnGhost, btnPrimary, inputCls, labelCls } from '@/components/admin/ui'
import { fetchCategories } from '@/services/catalog'
import { deleteCategory, reorderCategories, saveCategory } from '@/services/admin'
import type { Category } from '@/types'

function CategoryModal({
  category,
  nextOrder,
  onClose,
  onSaved,
}: {
  category: Category | null
  nextOrder: number
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await saveCategory(name, { id: category?.id, sortOrder: nextOrder })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
      setSaving(false)
    }
  }

  return (
    <Modal title={category ? 'Modifier la catégorie' : 'Nouvelle catégorie'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="c-name" className={labelCls}>Nom *</label>
          <input id="c-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={btnGhost}>Annuler</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)

  const load = useCallback(async () => {
    try {
      setCategories(await fetchCategories())
      setError(null)
    } catch {
      setError('Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- chargement initial depuis Supabase
    void load()
  }, [load])

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta
    if (target < 0 || target >= categories.length) return
    const next = [...categories]
    ;[next[index], next[target]] = [next[target], next[index]]
    setCategories(next)
    try {
      await reorderCategories(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réorganisation impossible.')
      await load()
    }
  }

  async function remove(c: Category) {
    if (!window.confirm(`Supprimer la catégorie « ${c.name} » ?`)) return
    try {
      await deleteCategory(c.id)
      setError(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  const nextOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Catégories</h1>
        <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>
          <Plus size={16} /> Ajouter une catégorie
        </button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
      {loading && <p className="mt-6 text-kenza-black/70">Chargement…</p>}

      {!loading && (
        <ul className="mt-6 divide-y divide-kenza-black/10 rounded-2xl bg-white shadow-sm">
          {categories.map((c, i) => (
            <li key={c.id} className="flex items-center gap-3 p-4">
              <span className="w-6 text-sm text-kenza-black/50">{i + 1}</span>
              <span className="flex-1 font-semibold">{c.name}</span>
              <button type="button" onClick={() => void move(i, -1)} disabled={i === 0} aria-label={`Monter ${c.name}`} className="rounded-full p-2 hover:bg-kenza-orange/10 disabled:opacity-30">
                <ArrowUp size={18} />
              </button>
              <button type="button" onClick={() => void move(i, 1)} disabled={i === categories.length - 1} aria-label={`Descendre ${c.name}`} className="rounded-full p-2 hover:bg-kenza-orange/10 disabled:opacity-30">
                <ArrowDown size={18} />
              </button>
              <button type="button" onClick={() => setEditing(c)} aria-label={`Modifier ${c.name}`} className="rounded-full p-2 hover:bg-kenza-orange/10 hover:text-kenza-orange">
                <Pencil size={18} />
              </button>
              <button type="button" onClick={() => void remove(c)} aria-label={`Supprimer ${c.name}`} className="rounded-full p-2 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={18} />
              </button>
            </li>
          ))}
          {categories.length === 0 && <li className="p-8 text-center text-kenza-black/60">Aucune catégorie.</li>}
        </ul>
      )}

      {editing && (
        <CategoryModal
          category={editing === 'new' ? null : editing}
          nextOrder={nextOrder}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void load()
          }}
        />
      )}
    </div>
  )
}
