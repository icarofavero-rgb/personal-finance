
import {
  getPendingPaymentOperation,
} from './cardPaymentRecovery'

import {
  checkPendingPayment,
} from './cardPaymentRecoveryCheck'

export type PaymentSafetyResult = {
  safe: boolean
  message: string
}

export function checkPaymentSafety(): PaymentSafetyResult {
  try {
    const pending = getPendingPaymentOperation()

    if (!pending) {
      return {
        safe: true,
        message: 'Nenhuma operação pendente encontrada.',
      }
    }

    const recovery = checkPendingPayment()

    return {
      safe: false,
      message:
        'Existe uma operação de pagamento pendente. ' +
        'Situação: ' +
        recovery.message +
        ' Verifique os registros antes de tentar novamente.',
    }
  } catch {
    return {
      safe: false,
      message:
        'Não foi possível verificar a segurança dos pagamentos. ' +
        'O registro de recuperação pode estar corrompido. ' +
        'Não registre novos pagamentos até verificar os dados.',
    }
  }
}
