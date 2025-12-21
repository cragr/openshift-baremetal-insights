import { Label } from '@patternfly/react-core';

interface UpdateBadgeProps {
  count: number;
}

export const UpdateBadge: React.FC<UpdateBadgeProps> = ({ count }) => {
  if (count === 0) {
    return <Label color="green">0</Label>;
  }
  return <Label color="orange">{count}</Label>;
};
