import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import MemberList from '../components/MemberList'
import { useChatStore } from '../store/chat'

export default function Chat() {
  const activeRoomId = useChatStore(s => s.activeRoomId)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 overflow-hidden">
        {activeRoomId
          ? <ChatWindow roomId={activeRoomId} />
          : <div className="flex flex-1 items-center justify-center text-gray-500">Select a room or contact</div>
        }
        {activeRoomId && <MemberList roomId={activeRoomId} />}
      </div>
    </div>
  )
}
