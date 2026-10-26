import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProctoring } from '../../hooks/useProctoring'
import '../../i18n/proctor'

type Props = { attemptId: string; enabled: boolean }

// Watches the exam and covers the screen with a message when something is wrong
export default function ProctorLayer({ attemptId, enabled }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { fullscreen, warning, dismiss, enterFullscreen } = useProctoring(attemptId, enabled, () =>
    navigate('/attempts/' + attemptId + '/done', { replace: true }),
  )

  if (!enabled || (!warning && fullscreen)) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="proctor-title" className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg">
        <h2 id="proctor-title" className={'text-xl font-bold ' + (warning ? 'text-red-600' : 'text-text')}>
          {warning ? t('exam.proctor.warnTitle') : t('exam.proctor.gateTitle')}
        </h2>

        {warning ? (
          <div className="mt-3 space-y-2 text-text">
            <p>{warning.kind === 'TAB_SWITCH' ? t('exam.proctor.warnTab') : t('exam.proctor.warnFullscreen')}</p>
            <p className="font-semibold">{t('exam.proctor.count', { n: warning.count, max: warning.max })}</p>
            {warning.count < warning.max ? (
              <p>{t('exam.proctor.left', { n: warning.max - warning.count })}</p>
            ) : null}
            <p className="text-sm text-text/70">{t('exam.proctor.integrity', { n: warning.integrity })}</p>
          </div>
        ) : (
          <p className="mt-3 text-text">{t('exam.proctor.gateBody')}</p>
        )}

        <button
          type="button"
          onClick={fullscreen ? dismiss : () => void enterFullscreen()}
          className="mt-6 w-full rounded-md bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-hover"
        >
          {fullscreen ? t('exam.proctor.ok') : warning ? t('exam.proctor.back') : t('exam.proctor.enter')}
        </button>
      </div>
    </div>
  )
}