import React from 'react'

interface Preset {
  label: string
  value: number
}

interface PresetButtonsProps {
  presets: Preset[]
  onSelect: (value: number) => void
}

const PresetButtons: React.FC<PresetButtonsProps> = ({ presets, onSelect }) => {
  return (
    <div className="preset-buttons">
      {presets.map((preset, index) => (
        <button
          key={index}
          type="button"
          className="preset-btn"
          onClick={() => onSelect(preset.value)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}

export default PresetButtons