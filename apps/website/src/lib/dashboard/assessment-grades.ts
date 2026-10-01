import type { Assessment, GradeDetail } from '@/types/dashboard';
export function gradeDetail(assessment: Assessment, id: string): GradeDetail {
  return assessment.gradeDetails?.[id] || { status: assessment.grades[id] == null ? 'Sem nota' : 'Avaliado', value: assessment.grades[id] == null ? '' : String(assessment.grades[id]), feedback: '', difficulties: [] };
}
export function gradePending(assessment: Assessment, id: string) {
  return gradeDetail(assessment, id).status === 'Sem nota';
}
export function validGrade(detail: GradeDetail) {
  return detail.status !== 'Avaliado' || (detail.value.trim() !== '' && /^\d{1,2}([.,]\d{1,2})?$/.test(detail.value) && Number(detail.value.replace(',', '.')) >= 0 && Number(detail.value.replace(',', '.')) <= 20);
}
