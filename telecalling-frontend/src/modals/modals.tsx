import React from 'react';
import { EditUserModal } from './edit-user-modal';
import { CreateLeadModal } from './create-lead-modal';
import { CreateUserModal } from './create-user-modal';
import { SetGoalModal } from './set-goal-modal';
import { EditLeadSheet } from './edit-lead-modal';
import { useAuth } from '@/hooks/use-auth';
import { BulkUploadResultModal } from './bulk-upload-result-modal';

const Modals = () => {
  const { role } = useAuth();

  return (
    <>
      {role === 'admin' && <CreateLeadModal />}
      {role === 'admin' && <BulkUploadResultModal />}
      <EditLeadSheet />

      {/* if we use role !== 'telecaller' it will always mount it evne on home page */}

      {/* user */}
      {(role === 'admin' || role === 'leader') && <CreateUserModal />}
      {(role === 'admin' || role === 'leader') && <EditUserModal />}

      {/*goals */}
      {(role === 'admin' || role === 'leader') && <SetGoalModal />}
    </>
  );
};

export default Modals;
