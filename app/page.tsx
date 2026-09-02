"use client"

import { useState, useEffect, useRef } from "react"
import { auth, googleProvider } from "@/lib/firebase"
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth"
import { doc, setDoc, getDoc, getDocs, deleteDoc, collection, addDoc, query, where, onSnapshot, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase" 

export default function Home() {
  const clockRef = useRef<HTMLDivElement>(null)
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const[selectedUnit, setSelectedUnit] = useState<"hour" | "minute">("minute")
  const[isRunning, setIsRunning] = useState(false)
  const[hours, setHours] = useState(1)
  const[minutes, setMinutes] = useState(10)
  const[remainingSeconds, setRemainingSeconds] = useState(0)
  const[isFinished, setIsFinished] = useState(false)
  const[showEndScreen, setShowEndScreen] = useState(false)
  const[typingDone, setTypingDone] = useState(false)
  const[user, setUser] = useState<User | null>(null)
  const[showMyPage, setShowMyPage] = useState(false)
  const[authChecked, setAuthChecked] = useState(false)
  const[minTimeElapsed, setMinTimeElapsed] = useState(false)

  //スプラッシュ画面の表示時間
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true)
    },2000)
    
    return () => clearTimeout(timer)
  },[])
  //

  // 開始
  function handleStart(){
    if(hours === 0 && minutes === 0) return
    if(items.length === 0) return

    setIsRunning(true)
    setRemainingSeconds(5)
    // setRemainingSeconds(hours*3600 + minutes*60)

    //勉強状態
    if(userData){
      updateDoc(doc(db, "users", userData.uid),{
        studyStatus: "studying",
      })
    }
  }

  // 終了
  const fullMessage = "お疲れ様でした。"
  const [typingIndex, setTypingIndex] = useState(0)

  function handleEnd(){
    if(showEndScreen) return
    setShowEndScreen(true)
    setTypingDone(false)
    setTypingIndex(0)
  }

  useEffect(() => {
  if(!showEndScreen) return
  if(typingDone) return

    const id = setInterval(() => {
      setTypingIndex(prev => {
        if(prev >= fullMessage.length){
          clearInterval(id)
          setTypingDone(true)
          return prev
        }
        return prev + 1
      })
    }, 150)

    return () => clearInterval(id)
  }, [showEndScreen, typingDone])

  const displayedMessage = fullMessage.slice(0, typingIndex)

  function handleTapEndScreen(){
    if(!typingDone) return
    setShowEndScreen(false)
    setIsRunning(false)
    setIsFinished(false)
    setTypingDone(false)
    setTypingIndex(0)
    setHours(0)
    setMinutes(0)
    setSelectedUnit("minute")
    setItems([])

    if(userData){
      updateDoc(doc(db, "users", userData.uid),{
        studyStatus: "resting",
      })
    }
  }

  useEffect(()=>{
    if(!isRunning) return

    const intervalId = setInterval(()=>{
      setRemainingSeconds(prev=>{
        if(prev<=1){
          clearInterval(intervalId)
          setIsFinished(true)
          return 0
        }
        return prev-1
      })
    },1000)
    return()=>{
      clearInterval(intervalId)
    }
  },[isRunning])
  //

  function handleSelectHour(){
    setSelectedUnit("hour")
  }

  function handleSelectMinute(){
    setSelectedUnit("minute")
  }

  // 時間カウント
  useEffect(()=>{
    const clockE1 = clockRef.current
    if(!clockE1) return
    function handleWheelNative(event:WheelEvent){
      event.preventDefault()
      if(isRunning) return
      const direction = event.deltaY>0 ? 1:-1
      if(selectedUnit == "hour"){
        setHours(prev => Math.max(0, prev+direction))
      }else{
        setMinutes(prev =>{
          let next = prev+direction*10
          if(next < 0) next=50
          if(next >= 60) next=0
          return next
        })
      }
    }

    clockE1.addEventListener("wheel",handleWheelNative,{passive:false})
    return() =>{
      clockE1.removeEventListener("wheel",handleWheelNative)
    }
  },[isRunning, selectedUnit])

  const displayHours = isRunning?Math.floor(remainingSeconds/3600):hours
  const displayMinutes = isRunning?Math.floor((remainingSeconds%3600)/60):minutes
  const displaySeconds = isRunning?remainingSeconds%60:0
  //

  // リスト
  type TodoItem = {
    id:string
    text:string
    done:boolean
  }

  const [items, setItems] = useState<TodoItem[]>([])
  const [newItemText, setNewItemText] = useState("")

  //追加
  function handleAddItem(){
    if(newItemText.trim() === "") return
    
    const newItem: TodoItem = {
      id:crypto.randomUUID(),
      text:newItemText,
      done:false,
    }

    setItems(prev => [...prev, newItem])
    setNewItemText("")
  }

  //削除
  function handleRemoveItem(id:string){
    setItems(prev => prev.filter(item => item.id !== id))
  }

  //チェック状態
  function handleToggleItem(id:string){
    setItems(prev =>
      prev.map(item =>
        item.id === id ?{...item, done: !item.done}:item
      )
    )
  }
  //

  //ログイン・ログアウト
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser)

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid)
        const userSnap = await getDoc(userRef)

        if (!userSnap.exists()){
          const newUserData: UserData = {
            uid: currentUser.uid,
            displayName: currentUser.displayName ?? "",
            photoURL: currentUser.photoURL ?? "",
            friendCode: generateFriendCode(),
          }
          await setDoc(userRef, newUserData)
          setUserData(newUserData)
        }else{
          setUserData(userSnap.data() as UserData)
        }
      }else{
        setUserData(null)
      }

      setAuthChecked(true)
    })
    return () => unsubscribe()
  }, [])

  function handleLogin(){
    signInWithPopup(auth, googleProvider).catch((error) => {
      console.error("ログイン失敗：", error)
    })
  }

  function handleLogout(){
    signOut(auth)
    setShowMyPage(false)
  }
  //

  //フレンドコードの生成
  function generateFriendCode(){
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""
    for (let i=0; i<8; i++){
      if(i===4) code += "-"
      code += chars[Math.floor(Math.random()*chars.length)]
    }
    return code
  }
  //

  //firebaseのユーザー情報
  type UserData = {
    uid: string
    displayName: string
    photoURL: string
    friendCode: string
    studyStatus?: "resting" | "studying"
  }

  const[userData, setUserData] = useState<UserData | null>(null)
  //

  //フレンド機能
  type FriendRequest = {
    id: string
    fromUid: string
    toUid: string
    status: "pending" | "accepted" | "rejected"
  }

  const[showFriendPage, setShowFriendPage] = useState(false)
  const[friendView, setFriendView] = useState<"list" | "new" | "detail">("list")
  const[friendCodeInput, setFriendCodeInput] = useState("")
  const[friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const[friendUserDataMap, setFriendUserDataMap] = useState<Record<string, UserData>>({})
  const[selectedFriend, setSelectedFriend] = useState<{ request: FriendRequest, user: UserData} | null>(null)

  async function handleApplyFriend(){
    if(friendCodeInput.trim() === "") return
    if(!userData) return

    const usersRef = collection(db, "users")
    const q = query(usersRef, where("friendCode", "==", friendCodeInput.trim()))
    const snapshot = await getDocs(q)

    if(snapshot.empty){
      alert("そのフレンドコードのユーザーが見つかりません")
      return
    }

    const targetUser = snapshot.docs[0].data() as UserData

    if(targetUser.uid === userData.uid){
      alert("自分以外のIDを入力してください")
      return
    }

    const alreadyExists = friendRequests.some(req =>
      (req.fromUid === userData.uid && req.toUid === targetUser.uid) ||
      (req.fromUid === targetUser.uid && req.toUid === userData.uid)
    )

    if(alreadyExists) {
      alert("すでに申請済み、またはフレンドです")
      return
    }

    await addDoc(collection(db, "friendRequests"),{
      fromUid: userData.uid,
      toUid: targetUser.uid,
      status: "pending",
      createdAt: new Date(),
    })

    alert("申請しました。")
    setFriendCodeInput("")
    setFriendView("list")
  }

  const [requesterResults, setRequesterResults] = useState<FriendRequest[]>([])
  const [receiverResults, setReceiverResults] = useState<FriendRequest[]>([])

  useEffect(() => {
    if(!userData) return
    
    const qAsRequaester = query(
      collection(db, "friendRequests"),
      where("fromUid", "==", userData.uid)
    )

    const qAsReceiver = query(
      collection(db, "friendRequests"),
      where("toUid", "==", userData.uid)
    )

    const unsubscribe1 = onSnapshot(qAsRequaester, (snapshot)=> {
      setRequesterResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()})) as FriendRequest[])
    })

    const unsubscribe2 = onSnapshot(qAsReceiver, (snapshot)=> {
      setReceiverResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()})) as FriendRequest[])
    })

    return () => {
      unsubscribe1()
      unsubscribe2()
    }
  }, [userData])

  useEffect(() => {
    setFriendRequests([...requesterResults, ...receiverResults])
  },[requesterResults, receiverResults])

  useEffect(() => {
    async function fetchFriendUserData() {
      const newMap: Record<string, UserData> = {}

      for(const req of friendRequests) {
        const otherUid = req.fromUid === userData?.uid ? req.toUid:req.fromUid
        const userRef = doc(db, "users", otherUid)
        const userSnap = await getDoc(userRef)
        if(userSnap.exists()){
          newMap[otherUid] = userSnap.data() as UserData
        }
      }

      setFriendUserDataMap(newMap)
    }

    if(friendRequests.length > 0){
      fetchFriendUserData()
    }
  }, [friendRequests, userData])

  function handleOpenFriendDetail(req:FriendRequest, otherUser: UserData){
    setSelectedFriend({ request: req, user:otherUser })
    setFriendView("detail")
  }

  async function handleAcceptFriend(){
    if(!selectedFriend) return

    const reqRef = doc(db, "friendRequests", selectedFriend.request.id)
    await updateDoc(reqRef, {
      status: "accepted",
    })

    setFriendView("list")
    setSelectedFriend(null)
  }

  async function handleRejectFriend(){
    if(!selectedFriend) return

    const reqRef = doc(db, "friendRequests", selectedFriend.request.id)
    await deleteDoc(reqRef)

    setFriendView("list")
    setSelectedFriend(null)
  }
  //

  return (
    <>
      {authChecked && minTimeElapsed && (
        <header>
          <div id="title">
            <div id="title-text">FOCUS</div>
            <div id="title-dot">.</div>
          </div>
        </header>
      )}

      {showEndScreen && (
        <div id="end-screen" onClick={handleTapEndScreen}>
          <p id="end-message">{displayedMessage}</p>
        </div>
      )}

      <main>
        {!authChecked || !minTimeElapsed ? (
          <div id="splash-screen">
            <div id="splash-title">
              <span id="splash-title-text">FOCUS</span>
              <span id="splash-title-dot">.</span>
            </div>
          </div>
        ): !user ?(
          <div id="login-screen">
            <div id="login-card">
              <button id="google-login-button" onClick={handleLogin}>
                <img src="/google-icon.svg" alt="Google"/>Googleでログイン
              </button>
            </div>
          </div>
        ):(
          <>
            <div id="menu">
              <div id="menu-mypage" onClick={() => setShowMyPage(true)}>⚪︎my-page</div>
              <div id="menu-friend" onClick={() => {setShowFriendPage(true); setFriendView("list")}}>◎friend</div>
            </div>

            <div id="clock" ref={clockRef}>
              <div id="time">
                <span id="hour" className={`time-part ${selectedUnit === "hour" ? "selected" : ""}`} onClick={handleSelectHour}>{String(displayHours).padStart(2,"0")}</span>
                <span className="colon">:</span>
                <span id="minute" className={`time-part ${selectedUnit === "minute" ? "selected" : ""}`} onClick={handleSelectMinute}>{String(displayMinutes).padStart(2,"0")}</span>
                <span className="colon">:</span>
                <span id="second">{String(displaySeconds).padStart(2,"0")}</span>
              </div>
            </div>

            {!isRunning && (
              <button id="start-button" onClick={handleStart}>開始</button>
            )}
            {isRunning && isFinished && (
              <button id="end-button" onClick={handleEnd}>終了</button>
            )}

            {showMyPage && (
              <div id="mypage-overlay" onClick={() => setShowMyPage(false)}>
                <div id="mypage-card" onClick={(e) => e.stopPropagation()}>
                  <h2>my page</h2>
                  <div id="mypage-avatar">
                    {user?.photoURL && <img src={user.photoURL} alt="プロフィール画像"/>}
                  </div>
                  <p id="mypage-name">{user?.displayName}</p>
                  <p id="mypage-friendcode">Friend Code：{userData?.friendCode}</p>
                  <button id="logout-button" onClick={handleLogout}>ログアウト</button>
                </div>
              </div>
            )}

            {showFriendPage && (
              <div id="friend-overlay" onClick={() => setShowFriendPage(false)}>
                <div id="friend-card" onClick={(e) => e.stopPropagation()}>
                  {friendView === "list" && (
                    <>
                      <h2 id="friend-list-title">friend</h2>
                      <ul id="friend-list">
                        {friendRequests
                        .filter(req => {
                          if(req.status === "pending" && req.fromUid === userData?.uid){
                            return false
                          }
                          return true
                        })
                        .map(req => {
                          const otherUid = req.fromUid === userData?.uid ? req.toUid : req.fromUid
                          const otherUser = friendUserDataMap[otherUid]

                          if(!otherUser) return null
                          return(
                            <li 
                              key={req.id}
                              onClick={()=> handleOpenFriendDetail(req,otherUser)}
                            >
                              <div className="friend-avatar" style={{ backgroundImage: `url(${otherUser.photoURL})` }}></div>
                              <span className="friend-name">{otherUser.displayName}</span>
                              {req.status === "accepted" && (
                                <span className="friend-status">
                                  {otherUser.studyStatus === "studying" ? "勉強中":"休憩中"}
                                </span>
                              )}
                              {req.status === "pending" && req.toUid === userData?.uid && (
                                <button className="friend-add-request-button">追加</button>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                      <div id="friend-add-button" onClick={() => setFriendView("new")}>+</div>
                    </>
                  )}
                  {friendView === "new" && (
                    <>
                      <h2 id="newfriend-title">new friend</h2>
                      <label id="friend-code-label">Friend Code</label>
                      <input
                        type="text"
                        id="friend-code-input"
                        value={friendCodeInput}
                        onChange={(e) => setFriendCodeInput(e.target.value)}
                      />
                      <button id="apply-button" onClick={handleApplyFriend}>申請</button>
                    </>
                  )}
                  {friendView === "detail" && selectedFriend && (
                    <>
                      {selectedFriend.request.status === "accepted" ? (
                        <>
                          <h2>friend page</h2>
                          <div
                            className="friend-detail-avatar"
                            style={{backgroundImage:`url(${selectedFriend.user.photoURL})`}}
                          ></div>
                          <p className="friend-detail-name">{selectedFriend.user.displayName}</p>
                          <p className="friend-detail-userid">User ID：{selectedFriend.user.uid.slice(0,8)}</p>
                          <p className="friend-detail-code">Friend Cord：{selectedFriend.user.friendCode}</p>
                        </>
                      ):(
                        <>
                          <h2>not friend page</h2>
                          <div
                            className="friend-detail-avatar"
                            style={{backgroundImage: `url(${selectedFriend.user.photoURL})`}}></div>
                          <p className="friend-detail-name">{selectedFriend.user.displayName}</p>
                          <div className="friend-detail-buttons">
                            <button onClick={handleAcceptFriend}>追加</button>
                            <button onClick={handleRejectFriend}>拒否</button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div id="list">
              <div id="list-box">
                <ul id="checklist">
                  {items.map(item => (
                    <li key={item.id}>
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => handleToggleItem(item.id)}
                      />
                      <span className={`item-text ${item.done ? "done":""}`}>
                        {item.text}
                      </span>
                      {!isRunning && (
                        <button 
                          className="remove-button" onClick={() => handleRemoveItem(item.id)}>-</button>
                      )}
                    </li>
                  ))}
                  {!isRunning &&(
                    <li className="new-list">
                      <input type="checkbox" disabled/>
                      <input 
                        type="text" 
                        className="item-text" 
                        id="new-item-input" 
                        placeholder="" 
                        value={newItemText} 
                        onChange={(e)=>setNewItemText(e.target.value)}
                      />
                      <button id="add-button" onClick={handleAddItem}>+</button>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </>
        )}
      </main>

      <footer></footer>
    </>
  );
}
