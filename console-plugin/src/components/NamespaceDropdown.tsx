import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { getNamespaces } from '../services/api';

interface NamespaceDropdownProps {
  selected: string;
  onSelect: (namespace: string) => void;
}

export const NamespaceDropdown: React.FC<NamespaceDropdownProps> = ({ selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [namespaces, setNamespaces] = useState<string[]>([]);

  useEffect(() => {
    getNamespaces().then(setNamespaces).catch(console.error);
  }, []);

  const displayValue = selected || 'All Namespaces';

  return (
    <Select
      isOpen={isOpen}
      selected={selected}
      onSelect={(_e, value) => {
        onSelect(value === 'All Namespaces' ? '' : String(value));
        setIsOpen(false);
      }}
      onOpenChange={setIsOpen}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle ref={toggleRef} onClick={() => setIsOpen(!isOpen)} isExpanded={isOpen}>
          {displayValue}
        </MenuToggle>
      )}
    >
      <SelectList>
        <SelectOption value="All Namespaces">All Namespaces</SelectOption>
        {namespaces.map((ns) => (
          <SelectOption key={ns} value={ns}>
            {ns}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
