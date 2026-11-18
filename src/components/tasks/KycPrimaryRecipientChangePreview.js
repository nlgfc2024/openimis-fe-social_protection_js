import React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@material-ui/core';
import { formatMessage } from '@openimis/fe-core';
import { useIntl } from 'react-intl';

const KYC_DETAILS_WORKFLOW = 'Python KYC Details';

const parseJson = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string') return {};
  return JSON.parse(value);
};

const recipientLabel = (recipient, missingLabel) => {
  if (!recipient) return missingLabel;
  return [recipient.name, recipient.national_id].filter(Boolean).join(' — ');
};

export default function KycPrimaryRecipientChangePreview({ task }) {
  const intl = useIntl();
  const taskJsonExt = parseJson(task?.jsonExt);
  if (taskJsonExt.workflow !== KYC_DETAILS_WORKFLOW) return null;

  const changes = taskJsonExt.primary_recipient_changes || [];
  return (
    <>
      <Typography variant="subtitle1">
        {formatMessage(intl, 'socialProtection', 'approval.primaryRecipientChanges.title')}
      </Typography>
      {changes.length ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                {formatMessage(intl, 'socialProtection', 'approval.primaryRecipientChanges.formNumber')}
              </TableCell>
              <TableCell>
                {formatMessage(intl, 'socialProtection', 'approval.primaryRecipientChanges.currentRecipient')}
              </TableCell>
              <TableCell>
                {formatMessage(intl, 'socialProtection', 'approval.primaryRecipientChanges.proposedRecipient')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {changes.map((change) => (
              <TableRow key={`${change.form_number}-${change.proposed_recipient?.id}`}>
                <TableCell>{change.form_number}</TableCell>
                <TableCell>
                  {recipientLabel(
                    change.current_recipient,
                    formatMessage(intl, 'socialProtection', 'approval.primaryRecipientChanges.noCurrentRecipient'),
                  )}
                </TableCell>
                <TableCell>{recipientLabel(change.proposed_recipient, '')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Typography>
          {formatMessage(intl, 'socialProtection', 'approval.primaryRecipientChanges.none')}
        </Typography>
      )}
    </>
  );
}
