
import {
  checkPendingPayment,
} from './cardPaymentRecoveryCheck'

export type PaymentStartupResult = {
  needsAttention: boolean
  message: string
}

export function checkPaymentsOnStartup(): PaymentStartupResult {
  try {
    const result = checkPendingPayment()

    if (result.status === 'none') {
      return {
        needsAttention: false,
        message: '',
      }
    }

    if (result.status === 'complete') {
      return {
        needsAttention: true,
        message:
          'Um pagamento anterior foi registrado, ' +
          'mas sua finalização precisa ser verificada.',
      }
    }

    return {
      needsAttention: true,
      message:
        'Existe uma operação de pagamento pendente. ' +
        result.message +
        ' Não registre novamente esse pagamento ' +
        'antes de verificar os dados.',
    }
  } catch {
    return {
      needsAttention: true,
      message:
        'Não foi possível verificar as operações de pagamento. ' +
        'O registro de recuperação pode estar corrompido. ' +
        'Novos pagamentos devem permanecer bloqueados ' +
        'até a verificação dos dados.',
    }
  }
}
