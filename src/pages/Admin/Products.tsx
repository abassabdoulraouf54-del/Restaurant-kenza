import { useCallback, useEffect, useState, type FormEvent, useMemo } from 'react'
import { ImagePlus, Pencil, Plus, Star, Trash2, UtensilsCrossed } from 'lucide-react'
import Modal from '@/components/admin/Modal'
import { btnGhost, btnPrimary, inputCls, labelCls } from '@/components/admin/ui'
import { fetchCategories, fetchProducts } from '@/services/catalog'
import { deleteProduct, patchProduct, removeImage, saveProduct, uploadImage } from '@/services/admin'
import { formatXOF } from '@/utils/format'
import type { Category, Product } from '@/types'

interface FormProps {
  product: Product | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}

function ProductFormModal({ product, categories, onClose, onSaved }: FormProps) {
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(product ? String(product.price_xof) : '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '')
  const [available, setAvailable] = useState(product?.is_available ?? true)
  const [featured, setFeatured] = useState(product?.is_featured ?? false)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    const priceNum = Number(price)
    if (name.trim().length < 2) return setError('Nom requis (2 caractères minimum).')
    if (!price.trim() || !Number.isInteger(priceNum) || priceNum < 0 || priceNum > 1_000_000) {
      return setError('Prix invalide : entier entre 0 et 1 000 000 FCFA.')
    }
    if (!categoryId) return setError('Choisissez une catégorie.')

    setSaving(true)
    setError(null)
    let uploaded: string | null = null
    try {
      if (file) uploaded = await uploadImage(file, 'products')
      await saveProduct(
        {
          name: name.trim(),
          description: description.trim(),
          price_xof: priceNum,
          category_id: categoryId,
          is_available: available,
          is_featured: featured,
          image_url: uploaded ?? product?.image_url ?? null,
        },
        product?.id,
      )
      if (uploaded && product?.image_url) await removeImage(product.image_url)
      onSaved()
    } catch (err) {
      if (uploaded) await removeImage(uploaded)
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
      setSaving(false)
    }
  }

  const shownImage = preview ?? product?.image_url ?? null

  return (
    <Modal title={product ? 'Modifier le produit' : 'Nouveau produit'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="p-name" className={labelCls}>Nom *</label>
          <input id="p-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="p-desc" className={labelCls}>Description</label>
          <textarea id="p-desc" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-price" className={labelCls}>Prix (FCFA) *</label>
            <input id="p-price" type="number" inputMode="numeric" min={0} step={1} value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="p-cat" className={labelCls}>Catégorie *</label>
            <select id="p-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className={labelCls}>Photographie</span>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-xl bg-kenza-black/10">
              {shownImage ? <img src={shownImage} alt="" className="h-full w-full object-cover" /> : <UtensilsCrossed className="text-kenza-black/40" />}
            </div>
            <label className={`${btnGhost} cursor-pointer`}>
              <ImagePlus size={16} /> Choisir une image
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <p className="mt-1 text-xs text-kenza-black/60">JPG, PNG ou WebP, 10 Mo maximum (compressée automatiquement).</p>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="h-4 w-4 accent-kenza-orange" />
            Disponible
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 accent-kenza-orange" />
            Mettre en vedette
          </label>
        </div>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className={btnGhost}>Annuler</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([fetchCategories(), fetchProducts()])
      setCategories(c)
      setProducts(p)
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

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? '—'

  async function toggle(p: Product, field: 'is_available' | 'is_featured') {
    try {
      await patchProduct(p.id, { [field]: !p[field] })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible.')
    }
  }

  async function remove(p: Product) {
    if (!window.confirm(`Supprimer « ${p.name} » ? Les commandes déjà passées conservent son nom et son prix.`)) return
    try {
      await deleteProduct(p)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Produits</h1>
        <button
          type="button"
          onClick={() => setEditing('new')}
          disabled={categories.length === 0}
          title={categories.length === 0 ? 'Créez d’abord une catégorie' : undefined}
          className={btnPrimary}
        >
          <Plus size={16} /> Ajouter un produit
        </button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
      {loading && <p className="mt-6 text-kenza-black/70">Chargement…</p>}

      {!loading && (
        <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-kenza-black/10 text-xs uppercase tracking-wide text-kenza-black/60">
              <tr>
                <th className="p-4">Produit</th>
                <th className="p-4">Catégorie</th>
                <th className="p-4">Prix</th>
                <th className="p-4">Disponible</th>
                <th className="p-4">Vedette</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kenza-black/10">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-kenza-black/10">
                        {p.image_url ? <img src={p.image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <UtensilsCrossed size={18} className="text-kenza-black/40" />}
                      </div>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td className="p-4">{categoryName(p.category_id)}</td>
                  <td className="p-4 font-semibold">{formatXOF(p.price_xof)}</td>
                  <td className="p-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.is_available}
                      aria-label={`Disponibilité de ${p.name}`}
                      onClick={() => void toggle(p, 'is_available')}
                      className={`relative h-6 w-11 rounded-full transition ${p.is_available ? 'bg-kenza-orange' : 'bg-kenza-black/25'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${p.is_available ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      aria-pressed={p.is_featured}
                      aria-label={`Mettre ${p.name} en vedette`}
                      onClick={() => void toggle(p, 'is_featured')}
                      className={`rounded-full p-2 ${p.is_featured ? 'text-kenza-gold' : 'text-kenza-black/30 hover:text-kenza-gold'}`}
                    >
                      <Star size={20} fill={p.is_featured ? 'currentColor' : 'none'} />
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => setEditing(p)} aria-label={`Modifier ${p.name}`} className="rounded-full p-2 hover:bg-kenza-orange/10 hover:text-kenza-orange">
                        <Pencil size={18} />
                      </button>
                      <button type="button" onClick={() => void remove(p)} aria-label={`Supprimer ${p.name}`} className="rounded-full p-2 hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-kenza-black/60">Aucun produit.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductFormModal
          product={editing === 'new' ? null : editing}
          categories={categories}
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
