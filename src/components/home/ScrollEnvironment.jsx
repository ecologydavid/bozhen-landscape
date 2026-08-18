export default function ScrollEnvironment({ scenes, activeScene }) {
  return (
    <div className="scene-environment" aria-hidden="true">
      {scenes.map((scene) => (
        <span
          key={scene.id}
          className={`scene-environment__layer scene-environment__layer--${scene.tone}${
            activeScene === scene.id ? ' is-active' : ''
          }`}
          data-environment={scene.id}
        />
      ))}
      <span className="scene-environment__grain" />
    </div>
  )
}
