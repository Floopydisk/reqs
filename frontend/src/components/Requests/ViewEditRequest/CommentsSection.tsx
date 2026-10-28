"use client";

import { useState, useEffect, useCallback } from "react";
import { Textarea } from "../../ui/textarea";
import { Ellipsis, Send, Edit, Trash2, Loader2 } from "lucide-react";
import { getToken, getUser } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { toast } from "sonner";

interface Comment {
  _id: string;
  text: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  replies?: Comment[];
}

interface CommentsProps {
  entityId: string;
  entityType: "requisitions" | "bids";
}

export default function Comments({ entityId, entityType }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [originalEditText, setOriginalEditText] = useState("");
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);

  const token = getToken();
  const user = getUser();

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/${entityType}/${entityId}/comments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setComments(data.data);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, token]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/${entityType}/${entityId}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: newComment }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setNewComment("");
        fetchComments();
        toast.success("Comment added successfully");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const addReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/${entityType}/${entityId}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: replyText,
            parentComment: commentId,
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setReplyText("");
        setReplyingTo(null);
        fetchComments();
        toast.success("Reply added successfully");
      }
    } catch (error) {
      console.error("Error adding reply:", error);
      toast.error("Failed to add reply");
    } finally {
      setReplyLoading(false);
    }
  };

  const editComment = async (commentId: string) => {
    if (!editText.trim()) return;
    if (editText === originalEditText) {
      setEditingComment(null);
      setEditText("");
      setOriginalEditText("");
      return;
    }
    setEditLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: editText }),
      });
      const data = await response.json();
      if (data.success) {
        setEditingComment(null);
        setEditText("");
        setOriginalEditText("");
        fetchComments();
        toast.success("Comment updated successfully");
      }
    } catch (error) {
      console.error("Error editing comment:", error);
      toast.error("Failed to edit comment");
    } finally {
      setEditLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    setShowMenu(null);
    toast.loading("Deleting comment...", { id: `delete-${commentId}` });
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        fetchComments();
        toast.success("Comment deleted successfully", {
          id: `delete-${commentId}`,
        });
      } else {
        toast.error("Failed to delete comment", { id: `delete-${commentId}` });
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment", { id: `delete-${commentId}` });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    if (diffInMinutes < 1440)
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  useEffect(() => {
    if (entityId && token) {
      fetchComments();
    }
  }, [entityId, token, fetchComments]);

  return (
    <div className="w-full flex flex-col py-5 max-h-[450px] md:max-h-[600px] border border-[#E5E5E5] rounded-md shadow-xl bg-white overflow-y-auto">
      <div className="flex items-center px-4 gap-2 mb-4">
        <div className="w-9 h-9 rounded-full bg-[#0F1E7A] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 self-start">
          {user ? getInitials(user.firstName, user.lastName) : "U"}
        </div>
        <div className="relative flex-1">
          <Textarea
            placeholder="Start a conversation"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                addComment();
              }
            }}
            className="h-[40px] max-h-[120px] border border-[#9F9F9F] pr-10 resize-none"
          />
          <div
            className="absolute top-2 right-2 cursor-pointer"
            onClick={addComment}
          >
            {commentLoading ? (
              <Loader2 size={20} className="animate-spin text-[#0F1E7A]" />
            ) : (
              <Send
                color={newComment.trim() ? "#0F1E7A" : "#9F9F9F"}
                size={20}
              />
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-[#4F7396] mb-4" />

      <div className="flex-1 px-4 space-y-4">
        {comments.map((comment) => (
          <div key={comment._id} className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0F1E7A] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 self-start">
              {getInitials(comment.author.firstName, comment.author.lastName)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-md font-semibold">
                    {comment.author.firstName} {comment.author.lastName}
                  </p>
                  <p className="text-sm font-light">
                    {formatTimeAgo(comment.createdAt)}
                  </p>
                </div>
                {user?.id === comment.author._id && (
                  <div className="relative">
                    <Ellipsis
                      className="cursor-pointer"
                      onClick={() =>
                        setShowMenu(
                          showMenu === comment._id ? null : comment._id
                        )
                      }
                    />
                    {showMenu === comment._id && (
                      <div className="absolute right-0 top-6 bg-white border rounded-md shadow-lg z-10 min-w-[120px]">
                        <button
                          onClick={() => {
                            setEditingComment(comment._id);
                            setEditText(comment.text);
                            setOriginalEditText(comment.text);
                            setShowMenu(null);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 w-full text-left"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => deleteComment(comment._id)}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 w-full text-left text-red-600"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {editingComment === comment._id ? (
                <div className="relative mb-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        editComment(comment._id);
                      }
                    }}
                    className="pr-10 max-h-[120px] resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => editComment(comment._id)}
                      disabled={editLoading}
                      className="text-xs bg-[#0F1E7A] text-white px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"
                    >
                      {editLoading && (
                        <Loader2 size={12} className="animate-spin" />
                      )}
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingComment(null);
                        setEditText("");
                        setOriginalEditText("");
                      }}
                      className="text-xs bg-gray-500 text-white px-2 py-1 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-normal mb-2">{comment.text}</p>
              )}

              <span
                className="text-sm font-normal text-[#0F1E7A] hover:underline cursor-pointer mb-2"
                onClick={() =>
                  setReplyingTo(replyingTo === comment._id ? null : comment._id)
                }
              >
                Reply
              </span>

              {replyingTo === comment._id && (
                <div className="relative mb-4">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        addReply(comment._id);
                      }
                    }}
                    className="pr-10 max-h-[120px] resize-none"
                    autoFocus
                  />
                  <div
                    className="absolute top-2 right-2 cursor-pointer"
                    onClick={() => addReply(comment._id)}
                  >
                    {replyLoading ? (
                      <Loader2
                        size={16}
                        className="animate-spin text-[#0F1E7A]"
                      />
                    ) : (
                      <Send
                        color={replyText.trim() ? "#0F1E7A" : "#9F9F9F"}
                        size={16}
                      />
                    )}
                  </div>
                </div>
              )}

              {comment.replies?.map((reply) => (
                <div key={reply._id} className="ml-4 mt-4 flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0F1E7A] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 self-start">
                    {getInitials(reply.author.firstName, reply.author.lastName)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold">
                        {reply.author.firstName} {reply.author.lastName}
                      </p>
                      <p className="text-xs font-light">
                        {formatTimeAgo(reply.createdAt)}
                      </p>
                    </div>
                    <p className="text-sm font-normal">{reply.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {loading && comments.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Loader2 className="animate-spin mx-auto mb-2" size={20} />
            Loading comments...
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No comments yet. Start the conversation!
          </div>
        )}
      </div>
    </div>
  );
}
