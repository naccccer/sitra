import React from 'react';
import { InlineAlert } from '@/components/shared/ui';
import { useAdminUsersSettings } from '../hooks/useAdminUsersSettings';
import { CreateUserForm } from './CreateUserForm';
import { RolePermissionsMatrix } from './RolePermissionsMatrix';
import { UsersListTable } from './UsersListTable';

export const AdminUsersSettingsTab = ({ session, onRefreshSession }) => {
  const {
    users,
    matrixRoles,
    groups,
    isLoading,
    isCreating,
    busyUserId,
    isSavingMatrix,
    errorMsg,
    successMsg,
    rolePermissions,
    expandedModules,
    hasMatrixChanges,
    moduleStatus,
    createDraft,
    setCreateDraft,
    editingUserId,
    editDraft,
    setEditDraft,
    availableRoleOptions,
    handleCreateUser,
    handleUpdateUser,
    view,
    setView,
    handleLifecycleAction,
    handleSaveMatrix,
    handleResetMatrix,
    setModuleEnabled,
    toggleRolePermission,
    toggleModuleExpanded,
    startEditing,
    cancelEditing,
  } = useAdminUsersSettings({ session, onRefreshSession });

  return (
    <div className="space-y-4">
      <CreateUserForm
        createDraft={createDraft}
        setCreateDraft={setCreateDraft}
        availableRoleOptions={availableRoleOptions}
        isCreating={isCreating}
        onSubmit={handleCreateUser}
      />

      {errorMsg ? <InlineAlert tone="danger" title="خطا">{errorMsg}</InlineAlert> : null}
      {successMsg ? <InlineAlert tone="success" title="انجام شد">{successMsg}</InlineAlert> : null}

      <RolePermissionsMatrix
        isLoading={isLoading}
        isSavingMatrix={isSavingMatrix}
        hasMatrixChanges={hasMatrixChanges}
        matrixRoles={matrixRoles}
        groups={groups}
        rolePermissions={rolePermissions}
        expandedModules={expandedModules}
        moduleStatus={moduleStatus}
        onReset={handleResetMatrix}
        onSave={handleSaveMatrix}
        onToggleModule={toggleModuleExpanded}
        onSetModuleEnabled={setModuleEnabled}
        onTogglePermission={toggleRolePermission}
      />

      <UsersListTable
        users={users}
        isLoading={isLoading}
        session={session}
        busyUserId={busyUserId}
        editingUserId={editingUserId}
        editDraft={editDraft}
        setEditDraft={setEditDraft}
        availableRoleOptions={availableRoleOptions}
        onStartEditing={startEditing}
        onCancelEditing={cancelEditing}
        onSaveUser={handleUpdateUser}
        view={view}
        onChangeView={setView}
        onLifecycleAction={handleLifecycleAction}
      />
    </div>
  );
};
