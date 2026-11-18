import { useState, type FormEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { btnPrimary, btnGhost, inputCls, labelCls } from '@/components/admin/ui'
import { useSettings } from '@/hooks/useSettings'
import { removeImage, updateSettings, uploadImage } from '@/services/admin'
import type { RestaurantSettings } from '@/types'

function SettingsForm({ initial, onSaved }: { initial: RestaurantSettings; onSaved: () => void }) {
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp_number)
  const [phone, setPhone] = useState(initial.phone ?? '')
  const [email, setEmail] = useState(initial.email ?? '')
  const [address, setAddress] = useState(initial.address ?? '')
  const [hours, setHours] = useState(initial.opening_hours ?? '')
  const [fee, setFee] = useState(String(initial.delivery_fee_xof))
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setOk(false)

    const waDigits = whatsapp.replace(/\D/g, '')
    const feeNum = Number(fee)
    if (name.trim().length < 2) return setError('Nom du restaurant requis.')
    if (!/^\d{8,15}$/.test(waDigits)) return setError('Numéro WhatsApp invalide (indicatif pays inclus, ex. 22796953233).')
    if (!fee.trim() || !Number.isInteger(feeNum) || feeNum < 0 || feeNum > 100_000) return setError('Frais de livraison invalides (entier entre 0 et 100 000 FCFA).')
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Adresse e-mail invalide.')

    setSaving(true)
    setError(null)
    let uploaded: string | null = null
    try {
      if (logoFile) uploaded = await uploadImage(logoFile, 'branding')
      await updateSettings({
        name: name.trim(),
        description: description.trim(),
        whatsapp_number: waDigits,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        opening_hours: hours.trim() || null,
        delivery_fee_xof: feeNum,
        logo_url: uploaded ?? initial.logo_url,
      })
      if (uploaded && initial.logo_url) await removeImage(initial.logo_url)
      setLogoFile(null)
      setOk(true)
      onSaved()
    } catch (err) {
      if (uploaded) await removeImage(uploaded)
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mt-6 max-w-2xl space-y-5 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <div>
        <label htmlFor="s-name" className={labelCls}>Nom du restaurant *</label>
        <input id="s-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label htmlFor="s-desc" className={labelCls}>Description</label>
        <textarea id="s-desc" rows={4} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="s-wa" className={labelCls}>Numéro WhatsApp *</label>
          <input id="s-wa" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputCls} />
          <p className="mt-1 text-xs text-kenza-black/60">Avec l’indicatif, sans « + » (ex. 22796953233). Utilisé pour recevoir les commandes.</p>
        </div>
        <div>
          <label htmlFor="s-phone" className={labelCls}>Téléphone affiché</label>
          <input id="s-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+227 96 95 32 33" className={inputCls} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="s-email" className={labelCls}>E-mail</label>
          <input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="s-fee" className={labelCls}>Frais de livraison (FCFA) *</label>
          <input id="s-fee" type="number" min={0} step={1} inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="s-addr" className={labelCls}>Adresse</label>
        <textarea id="s-addr" rows={2} maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label htmlFor="s-hours" className={labelCls}>Horaires</label>
        <textarea id="s-hours" rows={3} maxLength={500} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Une ligne par plage horaire" className={inputCls} />
      </div>

      <div>
        <span className={labelCls}>Logo</span>
        <div className="flex items-center gap-4">
          {initial.logo_url && <img src={initial.logo_url} alt="Logo actuel" className="h-14 w-14 rounded-lg object-contain" />}
          <label className={`${btnGhost} cursor-pointer`}>
            <ImagePlus size={16} /> {logoFile ? logoFile.name : 'Choisir une image'}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {ok && <p role="status" className="text-sm text-green-700">Paramètres enregistrés.</p>}

      <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}</button>
    </form>
  )
}

export default function AdminSettings() {
  const { settings, loading, error, retry } = useSettings()

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Paramètres</h1>
      {loading && <p className="mt-6 text-kenza-black/70">Chargement…</p>}
      {error && <p className="mt-6 text-red-700">{error}</p>}
      {settings && <SettingsForm key={JSON.stringify(settings)} initial={settings} onSaved={retry} />}
    </div>
  )
}
