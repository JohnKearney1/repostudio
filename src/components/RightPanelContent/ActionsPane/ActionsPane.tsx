import { RocketIcon } from '@radix-ui/react-icons';
import './ActionsPane.css';
export default function ActionsPane() {
    return (
        <div className="actions-pane">
        <div className="actions-header">
            <div className="actions-header-icon">
            <RocketIcon width={'20px'} height={'20px'} />
            <div className="actions-header-icon-bg">
                <h4>Actions</h4>
                <h5>Selected Items</h5>
            </div>
            </div>
        </div>
        <div className="actions-details">
            This is the Actions Pane. Here you can perform various actions on the selected files.
        </div>
        </div>
    );
    }
