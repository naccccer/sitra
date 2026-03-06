import React from 'react'
import { Navigate } from 'react-router-dom'
import { ModuleRegistryPanel } from '../components/ModuleRegistryPanel'

export const SystemSettingsPage = ({ session, onRegistryUpdated }) => {
  const canManageSystemSettings = Boolean(session?.capabilities?.canManageSystemSettings || session?.role === 'admin')

  if (!canManageSystemSettings) {
    return <Navigate to="/settings" replace />
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <ModuleRegistryPanel onRegistryUpdated={onRegistryUpdated} />
    </div>
  )
}
