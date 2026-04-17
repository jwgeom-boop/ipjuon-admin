const API_BASE_URL = 'https://banking-coroner-grader.ngrok-free.dev/api'

const getHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const api = {
  getConsultations: async () => {
    const res = await fetch(`${API_BASE_URL}/consultation`, { headers: getHeaders() })
    if (!res.ok) throw new Error('데이터 조회 실패')
    return res.json()
  },

  createConsultation: async (data: object) => {
    const res = await fetch(`${API_BASE_URL}/consultation`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('등록 실패')
    return res.json()
  },

  updateConsultation: async (id: string, data: object) => {
    const res = await fetch(`${API_BASE_URL}/consultation/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('업데이트 실패')
    return res.json()
  },

  // 공지사항
  getNotices: async () => {
    const res = await fetch(`${API_BASE_URL}/notices`, { headers: getHeaders() })
    if (!res.ok) throw new Error('공지 조회 실패')
    return res.json()
  },
  createNotice: async (data: object) => {
    const res = await fetch(`${API_BASE_URL}/notices`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })
    if (!res.ok) throw new Error('공지 작성 실패')
    return res.json()
  },
  updateNotice: async (id: string, data: object) => {
    const res = await fetch(`${API_BASE_URL}/notices/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) })
    if (!res.ok) throw new Error('공지 수정 실패')
    return res.json()
  },
  deleteNotice: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/notices/${id}`, { method: 'DELETE', headers: HEADERS })
    if (!res.ok) throw new Error('공지 삭제 실패')
  },

  // 업체 관리
  getVendors: async () => {
    const res = await fetch(`${API_BASE_URL}/vendors`, { headers: getHeaders() })
    if (!res.ok) throw new Error('업체 조회 실패')
    return res.json()
  },
  createVendor: async (data: object) => {
    const res = await fetch(`${API_BASE_URL}/vendors`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })
    if (!res.ok) throw new Error('업체 추가 실패')
    return res.json()
  },
  updateVendor: async (id: string, data: object) => {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) })
    if (!res.ok) throw new Error('업체 수정 실패')
    return res.json()
  },
  toggleVendorStatus: async (id: string, status: string) => {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}/status`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ status }) })
    if (!res.ok) throw new Error('상태 변경 실패')
    return res.json()
  },
  deleteVendor: async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}`, { method: 'DELETE', headers: HEADERS })
    if (!res.ok) throw new Error('업체 삭제 실패')
  },

  // 비밀번호 변경
  changePassword: async (loginId: string, currentPassword: string, newPassword: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ loginId, currentPassword, newPassword }),
    })
    if (!res.ok) throw new Error('비밀번호 변경 실패')
    return res.json()
  },

  // 은행 상담사 전용
  getBankConsultations: async (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    const res = await fetch(`${API_BASE_URL}/bank/consultations${query}`, { headers: getHeaders() })
    if (!res.ok) throw new Error('조회 실패')
    return res.json()
  },
  updateBankConsultation: async (id: string, data: object) => {
    const res = await fetch(`${API_BASE_URL}/bank/consultations/${id}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('저장 실패')
    return res.json()
  },
  updateBankStatus: async (id: string, loan_status: string) => {
    const res = await fetch(`${API_BASE_URL}/bank/consultations/${id}/status`, {
      method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ loan_status }),
    })
    if (!res.ok) throw new Error('상태 변경 실패')
    return res.json()
  },
  getBankSummary: async (bank_name?: string) => {
    const query = bank_name ? `?bank_name=${encodeURIComponent(bank_name)}` : ''
    const res = await fetch(`${API_BASE_URL}/bank/summary${query}`, { headers: getHeaders() })
    if (!res.ok) throw new Error('집계 조회 실패')
    return res.json()
  },
}
