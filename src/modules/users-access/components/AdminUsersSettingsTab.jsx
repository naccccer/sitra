import React from 'react';
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
    handleToggleActive,
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

      {errorMsg && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-black px-3 py-2">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-black px-3 py-2">{successMsg}</div>
      )}

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
        onToggleActive={handleToggleActive}
      />
    </div>
  );
};
