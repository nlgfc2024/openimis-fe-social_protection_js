import React from 'react';
import { FormattedMessage } from '@openimis/fe-core';

const GroupBeneficiaryTaskTableHeaders = () => [
  <FormattedMessage module="socialProtection" id="groupBeneficiary.task.group.id" />,
  <FormattedMessage module="socialProtection" id="beneficiary.task.benefitPlan.id" />,
  <FormattedMessage module="socialProtection" id="beneficiary.status" />,
];

// A create request has no beneficiary entity yet. Its incoming payload names
// the existing household and programme; the beneficiary UUID is not a household.
const GroupBeneficiaryTaskItemFormatters = () => [
  (beneficiary) => beneficiary?.group_id,
  (beneficiary) => beneficiary?.benefit_plan_id,
  (beneficiary) => beneficiary?.status,
];

export { GroupBeneficiaryTaskTableHeaders, GroupBeneficiaryTaskItemFormatters };
