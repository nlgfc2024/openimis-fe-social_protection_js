export default function benefitPlanUpdateSuccessMessageKey(updatesRequireApproval) {
  return updatesRequireApproval === true
    ? 'benefitPlan.update.submittedForApproval'
    : 'benefitPlan.update.success';
}
