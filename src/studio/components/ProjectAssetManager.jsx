import { useState } from 'react'
import { supabase } from '../lib/supabase'
import AssetLibrary from './AssetLibrary'
import AssetUploader from './AssetUploader'

export default function ProjectAssetManager({ client = supabase, projectId }) {
  const [refreshToken, setRefreshToken] = useState(0)

  return (
    <div className="studio-project-assets">
      <AssetUploader
        client={client}
        projectId={projectId}
        onUploaded={() => setRefreshToken((token) => token + 1)}
      />
      <AssetLibrary
        client={client}
        projectId={projectId}
        refreshToken={refreshToken}
      />
    </div>
  )
}
