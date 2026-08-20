import { useState } from 'react';
import {
  alignDevices,
  createGroup,
  distributeDevices,
  removeDevices,
  setDevicesLocked,
  addTimelineEvent,
  assignHotkey,
} from '../../commands';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useProjectStore } from '../../stores/projectStore';
import { IconButton } from '../common/IconButton';
import { HotkeyCaptureButton } from '../common/HotkeyCaptureButton';
import { formatTime } from '../../utils/time';
import type { DeviceInstance } from '../../types';

const GROUP_COLORS = ['#4f8cff', '#e0693f', '#4bbf7a', '#d6a23c', '#a06fe0', '#4fb8d6'];

export function MultiSelectToolsPanel({ devices }: { devices: DeviceInstance[] }) {
  const ids = devices.map((d) => d.id);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const trimStart = useProjectStore((s) => s.project.audio.trimStart);
  const [groupName, setGroupName] = useState('');

  return (
    <div className="inspector-section">
      <div className="inspector-group-title">{devices.length} Devices Selected</div>

      <button
        type="button"
        className="inspector-trigger-button inspector-trigger-button--cue"
        title="Adds one timeline event per selected device, all at the current playhead position"
        onClick={() =>
          ids.forEach((deviceId) =>
            addTimelineEvent({
              time: currentTime,
              duration: 0.5,
              targetType: 'device',
              targetId: deviceId,
              action: 'trigger',
              parameters: {},
            }),
          )
        }
      >
        Add Cue for {devices.length} Devices at {formatTime(Math.max(0, currentTime - trimStart))}
      </button>

      <div className="inspector-group-title">Hotkeys (live trigger)</div>
      <HotkeyCaptureButton
        label={`Assign Hotkey for ${devices.length} Devices`}
        onCapture={(code, keyLabel) =>
          assignHotkey(code, keyLabel, ids, devices.map((d) => d.name).join(' + '))
        }
      />

      <div className="inspector-group-title">Align</div>
      <div className="inspector-toolgrid">
        <IconButton icon="align-left" label="Align Left" onClick={() => alignDevices(ids, 'left')} />
        <IconButton icon="align-center-x" label="Align Center" onClick={() => alignDevices(ids, 'center-x')} />
        <IconButton icon="align-right" label="Align Right" onClick={() => alignDevices(ids, 'right')} />
      </div>

      <div className="inspector-group-title">Distribute</div>
      <div className="inspector-toolgrid">
        <IconButton
          icon="distribute-h"
          label="Distribute Horizontally"
          onClick={() => distributeDevices(ids, 'horizontal')}
          disabled={devices.length < 3}
        />
        <IconButton
          icon="distribute-v"
          label="Distribute Vertically"
          onClick={() => distributeDevices(ids, 'vertical')}
          disabled={devices.length < 3}
        />
      </div>

      <div className="inspector-group-title">Group</div>
      <div className="inspector-section__row inspector-section__row--gap">
        <input
          className="inspector-text-input"
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />
        <IconButton
          icon="group"
          label="Group Selected"
          onClick={() => {
            if (!groupName.trim()) return;
            createGroup(groupName.trim(), ids, GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]);
            setGroupName('');
          }}
        />
      </div>

      <div className="inspector-group-title">Actions</div>
      <div className="inspector-toolgrid">
        <IconButton icon="lock" label="Lock" onClick={() => setDevicesLocked(ids, true)} />
        <IconButton icon="unlock" label="Unlock" onClick={() => setDevicesLocked(ids, false)} />
        <IconButton icon="trash" label="Delete" onClick={() => removeDevices(ids)} />
      </div>
    </div>
  );
}
